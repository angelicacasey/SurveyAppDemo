'use strict'
var AWS = require("aws-sdk");

AWS.config.update({
	region: "us-east-1",
	endpoint: "http://localhost:8000"
});

var docClient = new AWS.DynamoDB.DocumentClient();
var table = "SurveyData";

function getUniqueId() {
	return new Date().valueOf().toString(36) + Math.random().toString(36).substr(2);
}

function getCurrentTimestamp() {
	var d = new Date();
	return d.toISOString();
}

exports.getAllProjects = function(req, res) {
	var params = {
		TableName: table,
		IndexName: "Type-AssocId-Index",
		FilterExpression: "attribute_not_exists(deactivated)",
		KeyConditionExpression: "dataType = :type",
		ExpressionAttributeValues: {
			":type": "PROJECT"
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

exports.addProject = function(req, res) {
	console.log("project to add: " + JSON.stringify(req.body));
	var project = req.body;
	project.id = getUniqueId();
	project.createdDt = getCurrentTimestamp();
	var params = {
		TableName: table,
		Item: req.body
	};
	docClient.put(params, (err, data) => {
		if (err) {
			console.error("Unable to add item. Error: ", JSON.stringify(err));
			res.send(err);
		} else {
			console.log("Item added ", JSON.stringify(data));
			res.json(project);
		}
	});
};

exports.getProject = function(req, res) {
	var projectId = req.params.id;
	var params = {
		TableName: table,
		Key: {
			"id": projectId
		}
	};
	getData(params).then(function(result) {
		res.json(result);
	}, function (err) {
		res.send(err);
	});
};

function getData(params) {

	return new Promise((resolve, reject) => {
		docClient.get(params, (err, data) => {
			if (err) {
				console.error("Unable to get item. Error: ", JSON.stringify(err));
				reject(err);
			} else {
				console.log("Item retrieved.", JSON.stringify(data));
				var project = data.Item;
				getEmployeeList(project.employees).then(function(result) {
					project.employees = result;
					resolve(project);
				}, function(err) {
					reject(err);
				});
			}
		});
	});
}

function getEmployeeList (listEmployeeIds) {

	return new Promise((resolve, reject) => {
		console.log("Getting list of employees: ", listEmployeeIds);
		var keys = [];
		listEmployeeIds.forEach(function(item) {
			keys.push({"id": item});
		});
		console.log(keys);
		var params = {
			RequestItems: {
				"SurveyData": {
					Keys: keys
				}
			}
		};
		docClient.batchGet(params, (err, data) => {
			if (err) {
				console.error("Unable to get item. Error: ", JSON.stringify(err));
				reject(err);
			} else {
				console.log(JSON.stringify(data));
				var results = data.Responses.SurveyData;
				resolve(results);
			}
		});
	});
}

exports.updateProject = function(req, res) {
	console.log("update project" + JSON.stringify(req.body));
	var project = req.body;
	project.updatedDt = getCurrentTimestamp();
	var params = {
		TableName: table,
		Item: project
	};
	docClient.put(params, (err, data) => {
		if (err) {
			console.error("Unable to update item. Error: ", JSON.stringify(err));
			res.send(err);
		} else {
			console.log("Item updated ", JSON.stringify(data))
			res.json(data);
		}
	});
};

exports.deleteProject = function(req, res) {
	console.log("delete project");
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

