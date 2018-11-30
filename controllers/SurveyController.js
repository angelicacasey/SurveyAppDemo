'use strict'
var AWS = require("aws-sdk");

AWS.config.update({
	region: "us-east-1",
	endpoint: "http://localhost:8000"
});

var docClient = new AWS.DynamoDB.DocumentClient();
var table = "SurveyData";
var questionTable = "SurveyQuestions"

function getUniqueId() {
	return new Date().valueOf().toString(36) + Math.random().toString(36).substr(2);
}

function getCurrentTimestamp() {
	var d = new Date();
	return d.toISOString();
}

exports.getAllSurveys = function(req, res) {
	var params = {
		TableName: table,
		IndexName: "Type-AssocId-Index",
		FilterExpression: "attribute_not_exists(deactivated)",
		KeyConditionExpression: "dataType = :type",
		ExpressionAttributeValues: {
			":type": "SURVEY"
		}
	};
	docClient.query(params, (err, data) => {
		if (err) {
			console.error("Unable to query. Error: ", JSON.stringify(err));
			res.send(err);
		} else {
			console.log("Query succeeded. ", JSON.stringify(data));
			res.json(data.Items);
		}
	});
};

exports.addSurvey = function(req, res) {
	console.log("Survey to add: " + JSON.stringify(req.body));
	// need to add survey record and then save the list of questions.
	var survey = req.body;
	survey.id = getUniqueId();
	survey.createdDt = getCurrentTimestamp();
	// build the survey form and save it to the db.
	survey.surveyform = buildSurveyForm(survey);
	var questions = survey.questions;
	delete survey.questions;
	var params = {
		TableName: table,
		Item: survey
	};
	docClient.put(params, (err, data) => {
		if (err) {
			console.error("Unable to add item. Error: ", JSON.stringify(err));
			res.send(err);
		} else {
			console.log("Item added");
			// save off questions (batch write)
			saveQuestions(questions, survey).then((result) => {
				survey.questions = result;
				res.json(survey);
			}, (err) => {
				res.send(err);
			});
		}
	});
};

function saveQuestions(questions, survey) {
	return new Promise ((resolve, reject) => {
		var requestList = [];
		questions.forEach((question) => {
			var request = {};
			if (question.deleted) {
				request = {
					DeleteRequest: {
          				Key: {
          					"id": question.id,
          					"surveyId": question.surveyId
          				}
          			}
				};
			} else {
				if (!question.hasOwnProperty("id")) {
					question.id = getUniqueId();
					question.surveyId = survey.id;
					question.createdDt = getCurrentTimestamp();
					question.searchCriteria = survey.clientId + "#" + survey.projectId;
					if (question.employeeId) {
						question.searchCriteria = question.searchCriteria + "#" + question.employeeId;
					}
					console.log("new question: ", JSON.stringify(question));
				} else {
					question.updatedDt = getCurrentTimestamp();
					console.log("updated question: ", JSON.stringify(question));
				}

				request = {
					PutRequest: {
	           			Item: question
					}
				};
			} 
			requestList.push(request);
		});
		var params = {
		  RequestItems: {
		    "SurveyQuestions": requestList
			}
		};
		console.log(JSON.stringify(params));
		docClient.batchWrite(params, (err, data) => {
			if (err) {
				console.error("Unable to save questions. Error ", JSON.stringify(err));
				reject(err);
			} else {
				console.log("Questions saved. ", JSON.stringify(data));
				resolve(questions);
			}
		});
	});
}

exports.getSurvey = function(req, res) {
	var surveyId = req.params.id;
	var params = {
		TableName: table,
		Key: {
			"id": surveyId
		}
	};
	docClient.get(params, (err, data) => {
		if (err) {
			console.error("Unable to get item. Error: ", JSON.stringify(err));
			res.send(err);
		} else {
			console.log("Item retrieved.");
			var survey = data.Item;
			getQuestionsForSurvey(survey.id).then((result) => {
				survey.questions = result;
				res.json(survey);
			}, (err) => {
				res.send(err);
			});
		}
	});
};

function getQuestionsForSurvey(surveyid) {

	return new Promise((resolve, reject) => {
		var params = {
			TableName: questionTable,
			KeyConditionExpression: "surveyId = :id",
			ExpressionAttributeValues: {
				":id": surveyid
			}
		};
		docClient.query(params, function(err, data) {
			if (err) {
				console.error("Unable to query. Error: ", JSON.stringify(err));
				reject(err);
			} else {
				console.log("Query succeeded ");
				var questions = data.Items;
				console.log(questions);
				resolve(questions);
			}
		});
	});
}

exports.updateSurvey = function(req, res) {
	console.log("update Survey" + JSON.stringify(req.body));
	// need to update survey record and then update the list of questions.
	var survey = req.body;
	survey.updatedDt = getCurrentTimestamp();
	survey.surveyform = buildSurveyForm(survey);
	var questions = survey.questions;
	delete survey.questions;
	var params = {
		TableName: table,
		Item: survey
	};
	docClient.put(params, (err, data) => {
		if (err) {
			console.error("Unable to update item. Error: ", JSON.stringify(err));
			res.send(err);
		} else {
			console.log("Item updated ", JSON.stringify(data))
			saveQuestions(questions, survey).then((result) => {
				// add questions to survey and return
				survey.questions = result;
				res.send(survey);
			}, (err) => {
				res.send(err);
			});
		}
	});
};

exports.deleteSurvey = function(req, res) {
	console.log("delete Survey");
	var params = {
		TableName: table,
		Key: {
			"id": req.params.id
		},
		UpdateExpression: "set deactivated = :deactivated, updatedDt = :updatedDt",
		ExpressionAttributeValues: {
			":deactivated": true,
			":updatedDt": getCurrentTimestamp()
		}
	};
	docClient.update(params, (err, data) => {
		if (err) {
			console.error("Unable to dectivate item. Error: ", JSON.stringify(err));
			res.send(err);
		} else {
			console.log("Item deactivated ", JSON.stringify(data))
			res.json(data);
		}
	});
}

exports.sendSurvey = function(req, res) {

	console.log("send Survey");
	var survey = req.body;
	console.log("survey: ", JSON.stringify(survey));
	survey.status = "Sent";
	survey.numTimesSent = survey.numTimesSent + 1;
	survey.lastSentDt = getCurrentTimestamp();
	survey.updatedDt = getCurrentTimestamp();
	delete survey.questions;
	var params = {
		TableName: table,
		Item: survey
	};

	docClient.put(params, (err, data) => {
		if (err) {
			console.error("Unable to update item. Error: ", JSON.stringify(err));
			res.send(err);
		} else {
			console.log("Item updated ", JSON.stringify(data))
			res.send(survey);
		}
	});
}

exports.saveResponse = function(req, res) {
	console.log("save Response");
	var response = req.body;
	console.log("data: ", JSON.stringify(response));

	// // TESTING
	// var survey = {
	// 	"id": "abc123",
	// 	"questions": ["1", "2"]
	// }

	// console.log(buildSurveyForm(survey));

	res.send("OK");
}

function buildSurveyForm(survey) {
	// add style
	var style = getStyle();

	var greeting = getGreeting(survey.id, survey.questions.length);

	// create questions
	var questions = "<ol>";
	var questionIdx = 1;
	survey.questions.forEach(question => {
		if (question.questionType.indexOf("Rating") !== -1) {
			questions += getRatingQuestion(question, questionIdx);
		} else {
			// custom question 
			questions += getCustomQuestion(question, questionIdx);
		}
		questionIdx++;
	});
	questions += '</ol> <input type="submit" value="Submit"> </fieldset>';

	var surveyForm = style + getFormBeginning() + greeting + questions + getFormEnd();
	return surveyForm;
}

function getStyle() {
	return '<style> .container { margin: 10px;}li { margin-top: 20px; margin-bottom: 20px;}.hide {display: none;}.clear {float: none;clear:both;}.rating {width: 90px;unicode-bidi: bidi-override; direction: rtl; text-align: center; position: relative;} .rating > label {float: right; display: inline; padding: 0; margin-top: 0; position: relative; width: 1.1em;cursor: pointer; color: #000;} .rating > label:hover, .rating > label:hover ~ label, .rating > input.radio-btn:checked ~ label {color: transparent;} .rating > label:hover:before, .rating > label:hover ~ label:before, .rating > input.radio-btn:checked ~ label:before, .rating > input.radio-btn:checked ~ label:before {content: "\\2605"; position: absolute; left: 0; color: #FFD700;} </style>';
}

function getFormBeginning() {
	return '<form action="http://localhost:8080/survey/response" method="post"> <div class="container">';
}

function getFormEnd() {
	return '<h4>Thank you!</h4> </div> </form>';
}

function getGreeting(surveyId, numQuestions) {
	var formBegining = '<h4>Greetings from MedAcuity</h4> <p>Can you please take a couple of moments to complete this survey to see how we are doing on your project?</p>';
	var hiddenFields = `<input type="hidden" name="id" value="${surveyId}"><input type="hidden" name="numQuestions" value="${numQuestions}">`;
	formBegining += hiddenFields;
	return formBegining;
}


function getRatingQuestion(question, questionIdx) {
	var namePrefix = "q" + questionIdx;
	var id = namePrefix + "id";
	var rating = namePrefix + "rating";
	var response = namePrefix + "response";

	var questionHtml = `<li><input type="hidden" name="${id}" value="${question.id}"><div class="container"><label>${question.question}</label></div> <div class="container"><div class="rating"><input id="${namePrefix}star5" name="${rating}" type="radio" value="5" class="radio-btn hide" /> <label for="${namePrefix}star5">&#x2606;</label><input id="${namePrefix}star4" name="${rating}" type="radio" value="4" class="radio-btn hide" /> <label for="${namePrefix}star4">&#x2606;</label><input id="${namePrefix}star3" name="${rating}" type="radio" value="3" class="radio-btn hide" /> <label for="${namePrefix}star3">&#x2606;</label><input id="${namePrefix}star2" name="${rating}" type="radio" value="2" class="radio-btn hide" /> <label for="${namePrefix}star2">&#x2606;</label><input id="${namePrefix}star1" name="${rating}" type="radio" value="1" class="radio-btn hide" />  <label for="${namePrefix}star1">&#x2606;</label><div class="clear"></div></div></div><div class="container"><label for="${response}">Comments:</label><input type="text" id="${response}" name="${response}"> </div></li>`;

	return questionHtml;
}

function getCustomQuestion(question, questionIdx) {
	var namePrefix = "q" + questionIdx;
	var id = namePrefix + "id";
	var questionHtml = `<input type="hidden" name="${id}" value="${question.id}"><div><label>${question.question}</label></div>`;
	
	var response = namePrefix + "response";
	if (question.options && question.options.length > 0) {
		var options = "";
		var idx = 1;
		question.options.forEach(option => {
			var optionId = namePrefix + "option" + idx;
			options += `<input id="${optionId}" name="${response}" type="radio" value="${option}" /><label for="${optionId}">${option}</label>`;
			idx++;
		});
		questionHtml += '<div class="container">' + options + '</div>';
	} else {
		questionHtml += `<div class="container"><input type="text" id="${response}" name="${response}"></div>`;
	}

	return "<li>" + questionHtml + "</li>";
}

