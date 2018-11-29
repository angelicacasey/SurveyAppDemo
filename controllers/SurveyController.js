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

