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

exports.getAllEmployees = function(req, res) {
	var params = {
		TableName: table,
		IndexName: "Type-AssocId-Index",
		FilterExpression: "attribute_not_exists(deactivated)",
		KeyConditionExpression: "dataType = :type",
		ExpressionAttributeValues: {
			":type": "EMPLOYEE"
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

exports.addEmployee = function(req, res) {
	console.log("Employee to add: " + JSON.stringify(req.body));
	var employee = req.body;
	employee.id = getUniqueId();
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
			res.json(employee);
		}
	});
};

exports.getEmployee = function(req, res) {
	var employeeId = req.params.id;
	var params = {
		TableName: table,
		Key: {
			"id": employeeId
		}
	};
	docClient.get(params, (err, data) => {
		if (err) {
			console.error("Unable to get item. Error: ", JSON.stringify(err));
			res.send(err);
		} else {
			console.log("Item retrieved: ", JSON.stringify(data));
			res.json(data.Item);
		}
	});

};

exports.updateEmployee = function(req, res) {
	console.log("update Employee" + JSON.stringify(req.body));
	var params = {
		TableName: table,
		Item: req.body
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

exports.deleteEmployee = function(req, res) {
	console.log("delete Employee");
	var params = {
		TableName: table,
		Key: {
			"id": req.params.id
		},
		UpdateExpression: "set deactivated = :deactivated",
		ExpressionAttributeValues: {
			":deactivated": true
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

