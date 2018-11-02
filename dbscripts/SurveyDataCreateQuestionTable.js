var AWS = require("aws-sdk");

AWS.config.update({
	region: "us-east-1",
	endpoint: "http://localhost:8000"
});

var dynamodb = new AWS.DynamoDB();
var tableName = "SurveyQuestions"

var params = {
	TableName: tableName,
	AttributeDefinitions: [
	{
		AttributeName: "surveyId", 
		AttributeType: "S"
    }, 
    {
		AttributeName: "id", 
		AttributeType: "S"
    }, 
    {
    	AttributeName: "questionType", 
    	AttributeType: "S"
    },
    {
    	AttributeName: "searchCriteria", 
    	AttributeType: "S"
    }
   ], 
	KeySchema: [
		{AttributeName: "surveyId", KeyType: "HASH"}, //Partition key
		{AttributeName: "id", KeyType: "RANGE"} // sort key
	],
	ProvisionedThroughput: {
		ReadCapacityUnits: 10,
		WriteCapacityUnits: 10
	},
	GlobalSecondaryIndexes : [
		{
			IndexName: "Type-Search-Index",
			KeySchema: [
				{AttributeName: "questionType", KeyType: "HASH"}, //Partition key
				{AttributeName: "searchCriteria", KeyType: "RANGE"} // sort key
			],
			Projection: {
				ProjectionType: "ALL"
			},
			ProvisionedThroughput: {
				ReadCapacityUnits: 10,
				WriteCapacityUnits: 10
			}		
		}
	]
};

dynamodb.createTable(params, function (err, data) {
	if (err) {
		console.error("Unable to create table. Error: ", JSON.stringify(err, null, 2));
	} else {
		console.error("Created table. Table Description: ", JSON.stringify(data, null, 2));
	}
});