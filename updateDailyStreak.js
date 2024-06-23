const AWS = require('aws-sdk');
//const s3 = new AWS.S3();
const dynamodb = new AWS.DynamoDB.DocumentClient

async function setUserStreak(tableName, userId, attribute) {
    const updateCount = 'SET #DailyStreak = :newStreak';
    const expressionAttributeValues = {
        ':newStreak': attribute 
    };
    const expressionAttributeNames = {
        '#DailyStreak': 'DailyStreak' 
    };
    try {
        const params = {
            TableName: tableName,
            Key: {
                'user-id': userId, 
            },
            UpdateExpression: updateCount,
            ExpressionAttributeValues: expressionAttributeValues,
            ExpressionAttributeNames: expressionAttributeNames,
            ReturnValues: "UPDATED_NEW" // Returns only the updated attributes
        };

        const data = await dynamodb.update(params).promise();
        return data.Attributes; // Return the updated attributes
      } catch (err) {
          console.error('Unable to check if user exists:', err);
          return false;
      }
}

module.exports = { setUserStreak };