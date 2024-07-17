const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB.DocumentClient

async function storePack(userId) {
  const params = {
      TableName: 'user-assets', // Replace with your DynamoDB table name
      Key: { 
          'user-id': userId,
      },
      UpdateExpression: 'SET #packs = if_not_exists(#packs, :initial) + :increment',
      ExpressionAttributeNames: {
          '#packs': 'packs', // Assuming 'packs' is the attribute storing pack counts
      },
      ExpressionAttributeValues: {
          ':initial': 0, // Initial value if the item doesn't exist
          ':increment': 1, // Increment value
      },
      ReturnValues: 'UPDATED_NEW', // Return updated attributes
  };

    try {
        const data = await dynamodb.update(params).promise();
        console.log('Item updated successfully:', data);
        return data;
    } catch (err) {
        console.error('Unable to update item:', err);
        throw err;
    }
}

async function getPacks(userId) {
    const params = {
        TableName: 'user-assets', // Replace with your DynamoDB table name
        Key: { 
            'user-id': userId,
        },
        ProjectionExpression: 'packs', // Specify the attribute(s) to retrieve
    };

    try {
        const data = await dynamodb.get(params).promise();
        //console.log('Successfully retrieved packs:', data.Item);
        if(data.Item === undefined){
            return 0;
        }
        return data.Item.packs || 0; // Return packs count, defaulting to 0 if attribute does not exist
    } catch (err) {
        console.error('Unable to read item:', err);
        throw err;
    }
}

async function removePack(userId) {
    const params = {
        TableName: 'user-assets', // Replace with your DynamoDB table name
        Key: { 'user-id': userId },
        UpdateExpression: 'SET packs = packs - :decrement',
        ExpressionAttributeValues: {
            ':decrement': 1, // Decrement value
        },
        ReturnValues: 'UPDATED_NEW', // Return updated attributes
    };

    try {
        const data = await dynamodb.update(params).promise();
        console.log('Pack removed successfully:', data);
        return data;
    } catch (err) {
        console.error('Unable to remove pack:', err);
        throw err;
    }
}

async function storeEventRoll(userId) {
    const params = {
        TableName: 'user-assets', // Replace with your DynamoDB table name
        Key: { 
            'user-id': userId,
        },
        UpdateExpression: 'SET #eventRolls = if_not_exists(#eventRolls, :initial) + :increment',
        ExpressionAttributeNames: {
            '#eventRolls': 'eventRolls', // Assuming 'eventRolls' is the attribute storing event roll counts
        },
        ExpressionAttributeValues: {
            ':initial': 0, // Initial value if the item doesn't exist
            ':increment': 1, // Increment value
        },
        ReturnValues: 'UPDATED_NEW', // Return updated attributes
    };

    try {
        const data = await dynamodb.update(params).promise();
        //console.log('Item updated successfully:', data);
        return data;
    } catch (err) {
        console.error('Unable to update item:', err);
        throw err;
    }
}

async function getEventRolls(userId) {
    const params = {
        TableName: 'user-assets', // Replace with your DynamoDB table name
        Key: { 
            'user-id': userId,
        },
        ProjectionExpression: 'eventRolls', // Specify the attribute(s) to retrieve
    };

    try {
        const data = await dynamodb.get(params).promise();
        //console.log('Successfully retrieved eventRolls:', data.Item);
        if (data.Item === undefined) {
            return 0;
        }
        return data.Item.eventRolls || 0; // Return eventRolls count, defaulting to 0 if attribute does not exist
    } catch (err) {
        console.error('Unable to read item:', err);
        throw err;
    }
}

async function removeEventRoll(userId) {
    const params = {
        TableName: 'user-assets', // Replace with your DynamoDB table name
        Key: { 'user-id': userId },
        UpdateExpression: 'SET eventRolls = eventRolls - :decrement',
        ExpressionAttributeValues: {
            ':decrement': 1, // Decrement value
        },
        ReturnValues: 'UPDATED_NEW', // Return updated attributes
    };

    try {
        const data = await dynamodb.update(params).promise();
        //console.log('Event roll removed successfully:', data);
        return data;
    } catch (err) {
        console.error('Unable to remove event roll:', err);
        throw err;
    }
}

async function storeAlbumToken(userId) {
    const params = {
        TableName: 'user-assets', // Replace with your DynamoDB table name
        Key: {
            'user-id': userId,
        },
        UpdateExpression: 'SET #albumTokens = if_not_exists(#albumTokens, :initial) + :increment',
        ExpressionAttributeNames: {
            '#albumTokens': 'albumTokens', // Change to 'albumTokens'
        },
        ExpressionAttributeValues: {
            ':initial': 0, // Initial value if the item doesn't exist
            ':increment': 1, // Increment value
        },
        ReturnValues: 'UPDATED_NEW', // Return updated attributes
    };

    try {
        const data = await dynamodb.update(params).promise();
        console.log('Item updated successfully:', data);
        return data;
    } catch (err) {
        console.error('Unable to update item:', err);
        throw err;
    }
}

async function removeAlbumToken(userId) {
    const params = {
        TableName: 'user-assets', // Replace with your DynamoDB table name
        Key: {
            'user-id': userId,
        },
        UpdateExpression: 'SET #albumTokens = #albumTokens - :decrement',
        ExpressionAttributeNames: {
            '#albumTokens': 'albumTokens', // Change to 'albumTokens'
        },
        ExpressionAttributeValues: {
            ':decrement': 1, // Decrement value
        },
        ReturnValues: 'UPDATED_NEW', // Return updated attributes
    };

    try {
        const data = await dynamodb.update(params).promise();
        console.log('Item updated successfully:', data);
        return data;
    } catch (err) {
        console.error('Unable to update item:', err);
        throw err;
    }
}

async function getAlbumTokens(userId) {
    const params = {
        TableName: 'user-assets', // Replace with your DynamoDB table name
        Key: { 
            'user-id': userId,
        },
        ProjectionExpression: 'albumTokens', // Specify the attribute(s) to retrieve
    };

    try {
        const data = await dynamodb.get(params).promise();
        //console.log('Successfully retrieved packs:', data.Item);
        if(data.Item === undefined){
            return 0;
        }
        return data.Item.albumTokens || 0; 
    } catch (err) {
        console.error('Unable to read item:', err);
        throw err;
    }
}



module.exports = {storePack, getPacks, removePack, storeEventRoll, getEventRolls, removeEventRoll, storeAlbumToken, removeAlbumToken, storeAlbumToken, getAlbumTokens};