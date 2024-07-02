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

module.exports = {storePack, getPacks, removePack};