var AWS = require("aws-sdk");

AWS.config.update({
	region: "us-east-1",
	endpoint: "http://localhost:8000"
});

var dynamodb = new AWS.DynamoDB();
var tableName = "SurveyData"

var params = {
	TableName: tableName,
	AttributeDefinitions: [
	{
		AttributeName: "id", 
		AttributeType: "S"
    }, 
    {
    	AttributeName: "dataType", 
    	AttributeType: "S"
    },
    {
    	AttributeName: "associatedId", 
    	AttributeType: "S"
    }
   ], 
	KeySchema: [
		{AttributeName: "id", KeyType: "HASH"} //Partition key
	],
	ProvisionedThroughput: {
		ReadCapacityUnits: 10,
		WriteCapacityUnits: 10
	},
	GlobalSecondaryIndexes : [
		{
			IndexName: "Type-AssocId-Index",
			KeySchema: [
				{AttributeName: "dataType", KeyType: "HASH"}, //Partition key
				{AttributeName: "associatedId", KeyType: "RANGE"} // sort key
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