// Object to store cooldown timestamps
const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();

async function saveUserCooldown(userId, command, cooldownTimestamp, channel) {
    const params = {
        TableName: 'user-cooldowns',
        Item: {
            "user-id": userId,
            command: command,
            cooldownTimestamp: cooldownTimestamp,
            channel: channel
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
                const hours = Math.floor(remainingTime / (1000 * 60 * 60));
                const minutes = Math.floor((remainingTime  % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((remainingTime  % (1000 * 60)) / 1000);
                return `${hours}h ${minutes}m ${seconds}s`;
            }
        }
        return '0m 0s';
    } catch (error) {
        console.error('Error getting cooldown:', error);
        return '0m 0s';
    }
};



module.exports = { saveUserCooldown, getUserCooldown};