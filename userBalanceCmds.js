const AWS = require('aws-sdk');
AWS.config.update({
    accessKeyId: process.env['Access_key'],
    secretAccessKey: process.env['Secret_access_key'],
    region: 'eu-west-2'
});
const dynamodb = new AWS.DynamoDB.DocumentClient();

async function getUsersBalance(userId) {
    const params = {
        TableName: 'Dani-bot-playerbase',
        Key: {
            'user-id': userId 
        }
    };

    try {
        const data = await dynamodb.get(params).promise();
        return data.Item ? data.Item.Balance : null;
    } catch (err) {
        console.error('Unable to load balance:', err);
        return null;
    }
}

async function saveUserBalance(userId, bal) {
    const params = {
        TableName: 'Dani-bot-playerbase',
        Key: {
            "user-id": userId
        },
        UpdateExpression: 'SET Balance = :bal',
        ExpressionAttributeValues: {
            ':bal': bal
        },
    };

    try {
        await dynamodb.update(params).promise();
    } catch (err) {
        console.error('Unable to save balance:', err);
    }
}

module.exports = { getUsersBalance, saveUserBalance };