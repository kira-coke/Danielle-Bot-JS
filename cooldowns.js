// Object to store cooldown timestamps
const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();

async function saveUserCooldown(userId, command, cooldownTimestamp) {
    const params = {
        TableName: 'user-cooldowns',
        Item: {
            "user-id": userId,
            command: command,
            cooldownTimestamp: cooldownTimestamp,
        },
    };

    try {
        await dynamoDB.put(params).promise();
        //console.log(`Cooldown saved for ${userId} - ${command}`);
    } catch (error) {
        console.error('Error saving cooldown:', error);
    }
};

async function getUserCooldown(userId, command) {
    const params = {
        TableName: 'user-cooldowns',
        Key: {
            "user-id": userId,
            command: command,
        },
    };

    try {
        const result = await dynamoDB.get(params).promise();
        if (result.Item) {
            const cooldownTimestamp = result.Item.cooldownTimestamp;
            const remainingTime = cooldownTimestamp - Date.now();
            if (remainingTime > 0) {
                const minutes = Math.floor(remainingTime / 60000);
                const seconds = Math.floor((remainingTime % 60000) / 1000);
                return `${minutes}m ${seconds}s`;
            }
        }
        return '0m 0s';
    } catch (error) {
        console.error('Error getting cooldown:', error);
        return '0m 0s';
    }
};

async function checkIfShortCut(userId, command, secondCommand) {
    const params = {
        TableName: 'YourTableName', // Replace with your DynamoDB table name
        KeyConditionExpression: 'userId = :uid and (command = :cmd or secondcommand = :scmd)',
        ExpressionAttributeValues: {
            ':uid': userId,
            ':cmd': command,
            ':scmd': secondCommand,
        },
    };

    try {
        const data = await dynamoDB.query(params).promise();
        if (data.Items.length > 0) {
            return { matched: true, item: data.Items[0] }; // Return the matched item
        } else {
            return { matched: false, item: null }; // No matching item found
        }
    } catch (error) {
        console.error('Error querying DynamoDB:', error);
        return { matched: false, item: null }; // Return false in case of any errors
    }
}

module.exports = { checkIfShortCut };


module.exports = { checkIfShortCut };



module.exports = { saveUserCooldown, getUserCooldown, checkIfShortCut };