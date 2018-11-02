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

exports.getAllClients = function(req, res) {
	console.log("current timestamp: ", getCurrentTimestamp());
	var params = {
		TableName: table,
		IndexName: "Type-AssocId-Index",
		FilterExpression: "attribute_not_exists(deactivated)",
		KeyConditionExpression: "dataType = :type",
		ExpressionAttributeValues: {
			":type": "CLIENT"
		}
	};
	docClient.query(params, (err, data) => {
		if (err) {
			console.error("Unable to query. Error: ", JSON.stringify(err));
			res.send(err);
		} else {
			console.log("Get all clients succeeded. ", JSON.stringify(data));
			res.json(data.Items);
		}
	});
};

exports.addClient = function(req, res) {
	console.log("client to add: " + JSON.stringify(req.body));
	var client = req.body;
	client.id = getUniqueId();
	client.createdDt = getCurrentTimestamp();
	var params = {
		TableName: table,
		Item: client
	};
	docClient.put(params, (err, data) => {
		if (err) {
			console.error("Unable to add item. Error: ", JSON.stringify(err));
			res.send(err);
		} else {
			console.log("Item added ", JSON.stringify(data));
			res.json(client);
		}
	});
};

exports.getClient = function(req, res) {
	var clientId = req.params.id;
	var params = {
		TableName: table,
		Key: {
			"id": clientId
		}
	};
	docClient.get(params, (err, data) => {
		if (err) {
			console.error("Unable to get item. Error: ", JSON.stringify(err));
			res.send(err);
		} else {
			console.log("Item retrieved.", JSON.stringify(data.Item));
			res.json(data.Item);
		}
	});
};

exports.updateClient = function(req, res) {
	console.log("update client" + JSON.stringify(req.body));
	var client = req.body;
	client.updatedDt = getCurrentTimestamp();
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

exports.deleteClient = function(req, res) {
	console.log("delete client");
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

