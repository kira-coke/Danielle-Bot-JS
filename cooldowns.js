// Object to store cooldown timestamps
const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const activeReminders = new Set();
const {getUser} = require('./users');

async function saveUserCooldown(userId, command, cooldownTimestamp, channel, reminderTimestamp = null) {
    const params = {
        TableName: 'user-cooldowns',
        Item: {
            "user-id": userId,
            command: command,
            cooldownTimestamp: cooldownTimestamp,
            channel: channel,
            reminderTimestamp: reminderTimestamp,
            active: true
        },
    };

    try {
        await dynamoDB.put(params).promise();
        console.log(`Cooldown saved for ${userId} - ${command}, channel ${channel}`);
    } catch (error) {
        console.error('Error saving cooldown:', error);
    }
}

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

/*async function checkIfShortCut(userId, command, secondCommand) {
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
}*/

async function getCoolDownStatus(userId, command){
    const params = {
        TableName: 'user-cooldowns',
        Key: {
            "user-id": userId,
            command: command,
        },
    };

    try {
        const result = await dynamoDB.get(params).promise();
        return result.Item.active;
    } catch (error) {
        console.error('Error getting cooldown:', error);
        return  null;
    }
}

async function updateCoolDownStatus(userId, command, status) {
    const params = {
        TableName: 'user-cooldowns',
        Key: {
            "user-id": userId,
            command: command,
        },
        UpdateExpression: "set active = :status",
        ExpressionAttributeValues: {
            ":status": status
        },
        ReturnValues: "UPDATED_NEW"
    };

    try {
        const result = await dynamoDB.update(params).promise();
        return result.Attributes.active;
    } catch (error) {
        console.error('Error updating cooldown:', error);
        return null;
    }
}

const loadPendingReminders = async () => {
    const now = Date.now();

    const params = {
        TableName: 'user-cooldowns',
        FilterExpression: 'reminderTimestamp < :now AND active = :active',
        ExpressionAttributeValues: {
            ':now': now,
            ':active': true
        }
    };

    try {
        const data = await dynamoDB.scan(params).promise();
        console.log(data);
        return data.Items;
    } catch (error) {
        console.error('Error loading pending reminders:', error);
        return [];
    }
};

const setPendingReminders = async (client) => {
    const reminders = await loadPendingReminders();
    if(reminders.length === 0){
        console.log("No pending reminders");
        return;
    }
    console.log(reminders);

    reminders.forEach(reminder => {
        if(reminder.active === false){
            console.log("Reminder has already been sent");
            return;
        }
        const reminderId = `${reminder["user-id"]}-${reminder.command}`;
        if (activeReminders.has(reminderId)) {
            return;
        }
        const timeUntilReminder = reminder.reminderTimestamp - Date.now();
        console.log(`Time until ${reminder.command} for ${reminder["user-id"]}: `, timeUntilReminder);
        getUser(reminder["user-id"]).then(user => {
            if (user.Reminders === true) {
                activeReminders.add(reminderId);
                setTimeout(() => {
                    let channel = "";
                    try{
                        channel = client.channels.cache.get(reminder.channel);
                    }catch(error){
                        console.log("Error getting channel", error);
                    }
                    try{
                        if (channel) {
                            try{
                                channel.send(
                                    `**Reminder:** <@${reminder["user-id"]}> your ${reminder.command} is ready!`
                                ).then(async () => {
                                    await updateCoolDownStatus(reminder["user-id"], reminder.command, false);
                                    activeReminders.delete(reminderId);
                                });
                            }catch(error){
                                console.log("Error sending reminder", error);
                            }
                        }
                        
                    }catch(error){
                        console.log("Error with getting channel", error);
                    }
                }, timeUntilReminder);
            } else {
                //console.log(`Skipping reminder for ${reminder["user-id"]} because reminders are not enabled.`);
            }
        }).catch(error => {
            console.error('Error fetching user data:', error);
        });
    });
};


module.exports = { saveUserCooldown, getUserCooldown, setPendingReminders,getCoolDownStatus, updateCoolDownStatus };