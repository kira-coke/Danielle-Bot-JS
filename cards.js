const AWS = require('aws-sdk');
//const s3 = new AWS.S3();
const dynamodb = new AWS.DynamoDB.DocumentClient

async function getRandomDynamoDBItem(tableName) {
    try {
        // Scan the table to get all items
        const scanParams = {
            TableName: tableName
        };
        const data = await dynamodb.scan(scanParams).promise();

        if (!data.Items || data.Items.length === 0) {
            throw new Error('No items found in the table');
        }

        // Randomize item selection
        const randomIndex = Math.floor(Math.random() * data.Items.length);
        const randomItem = data.Items[randomIndex];

        return randomItem;
    } catch (error) {
        console.error('Error retrieving items from DynamoDB:', error);
        throw error;
    }
}

async function writeToDynamoDB(tableName, item) {
    try {
        const params = {
            TableName: tableName,
            Item: item
        };
        // Call DynamoDB putItem API
        const data = await dynamodb.put(params).promise();
        console.log('Item successfully added to DynamoDB:', data);
        return data; // Optionally return the response if needed
    } catch (error) {
        console.error('Error writing to DynamoDB:', error);
        throw error;
    }
}

async function getHowManyCopiesOwned(tableName, primaryKeyValue, secondaryKeyValue) {
    try {
        const params = {
            TableName: tableName,
            KeyConditionExpression: '#pk = :pkValue AND #sk = :skValue',
            ExpressionAttributeNames: {
                '#pk': 'user-id',   // Replace with your partition key attribute name
                '#sk': 'card-id', // Replace with the attribute name you want to count instances of
                '#desiredAttr': 'copies-owned',
            },
            ExpressionAttributeValues: {
                ':pkValue': primaryKeyValue,
                ':skValue': secondaryKeyValue,
            },
            ProjectionExpression: '#desiredAttr' // Count the number of items matching the condition
        };
        // Call DynamoDB query API to count items
        const data = await dynamodb.query(params).promise();
        if((data.Items[0] === undefined)){
            return 0;
        }
        const attributeValue = data.Items[0]['copies-owned'];
        return attributeValue;
    } catch (error) {
        console.error('Error counting entries in DynamoDB:', error);
        throw error;
    }
}

async function getCardFromTable(tableName, key) {
    try {
        const params = {
            TableName: tableName,
            Key: {
                'card-id': key
            }
        };
        // Call DynamoDB getItem API
        const data = await dynamodb.get(params).promise();

        if (!data.Item) {
            throw new Error('Item not found in DynamoDB');
        }
        //console.log('Retrieved item from DynamoDB:', data.Item);
        return data.Item; // Return the retrieved item
    } catch (error) {
        //console.error('Error retrieving item from DynamoDB:', error);
        throw error;
    }
}

async function checkIfUserOwnsCard(tableName, key, secondaryKeyValue){
    try {
        const params = {
            TableName: tableName,
            KeyConditionExpression: '#pk = :pkValue AND #sk = :skValue',
            ExpressionAttributeNames: {
                '#pk': 'user-id',   // Replace with your partition key attribute name
                '#sk': 'card-id',
            },
            ExpressionAttributeValues: {
                ':pkValue': key,
                ':skValue': secondaryKeyValue,
            },
        };
        // Call DynamoDB query API to count items
        const data = await dynamodb.query(params).promise();
        if(data.Items.length === 0){
            return 0;
        }
        return data.Items.Count;
    } catch (error) {
        console.error('Error finding entry in DynamoDB:', error);
        throw error;
    }
}

async function getTotalCards(tableName){
    //get all items from table
    try {
        // Scan the table to get all items
        const scanParams = {
            TableName: tableName
        };
        const data = await dynamodb.scan(scanParams).promise();

        if (!data.Items || data.Items.length === 0) {
            throw new Error('No items found in the table');
        }
        //console.log(data);
        return data;
    } catch (error) {
        console.error('Error retrieving items from DynamoDB:', error);
        throw error;
    }
}

async function changeNumberOwned(tableName, primaryKeyValue, secondaryKeyValue, count){
    const updateCount = 'SET #copiesOwned = :newCopiesOwned';
    const expressionAttributeValues = {
        ':newCopiesOwned': count // New value for 'copies-owned'
    };
    const expressionAttributeNames = {
        '#copiesOwned': 'copies-owned' // Attribute name alias for 'copies-owned'
    };
    try {
        const params = {
            TableName: tableName,
            Key: {
                'user-id': primaryKeyValue, 
                'card-id': secondaryKeyValue 
            },
            UpdateExpression: updateCount,
            ExpressionAttributeValues: expressionAttributeValues,
            ExpressionAttributeNames: expressionAttributeNames,
            ReturnValues: "UPDATED_NEW" // Returns only the updated attributes
        };

        // Call DynamoDB update API
        const data = await dynamodb.update(params).promise();

        return data.Attributes; // Return the updated attributes
    } catch (error) {
        console.error('Error updating item in DynamoDB:', error);
        throw error;
    }
}

async function addToTotalCardCount(tableName, primaryKeyValue, count){
    const updateCount = 'SET #cardCount = :newCardCount';
    const expressionAttributeValues = {
        ':newCardCount': count // New value for 'copies-owned'
    };
    const expressionAttributeNames = {
        '#cardCount': 'cardCount' // Attribute name alias for 'copies-owned'
    };
    try {
        const params = {
            TableName: tableName,
            Key: {
                'user-id': primaryKeyValue, 
            },
            UpdateExpression: updateCount,
            ExpressionAttributeValues: expressionAttributeValues,
            ExpressionAttributeNames: expressionAttributeNames,
            ReturnValues: "UPDATED_NEW" // Returns only the updated attributes
        };

        // Call DynamoDB update API
        const data = await dynamodb.update(params).promise();

        return data.Attributes; // Return the updated attributes
    } catch (error) {
        console.error('Error updating item in DynamoDB:', error);
        throw error;
    }
}

async function checkTotalCardCount(tableName, primaryKeyValue){
    try {
        const params = {
            TableName: tableName,
            KeyConditionExpression: '#pk = :pkValue',
            ExpressionAttributeNames: {
                '#pk': 'user-id',   // Replace with your partition key attribute name
                '#desiredAttr': 'cardCount',
            },
            ExpressionAttributeValues: {
                ':pkValue': primaryKeyValue,
            },
            ProjectionExpression: '#desiredAttr' // Count the number of items matching the condition
        };
        // Call DynamoDB query API to count items
        const data = await dynamodb.query(params).promise();
        if((data.Items[0] === undefined)){
            return 0;
        }
        const attributeValue = data.Items[0]['cardCount'];
        return attributeValue;
    } catch (error) {
        console.error('Error counting entries in DynamoDB:', error);
        throw error;
    }
}

/*async function getRandomCard(bucketName){
    try {
        // List objects in the bucket
        const params = {
            Bucket: bucketName
        };
        const data = await s3.listObjectsV2(params).promise();

        if (!data.Contents || data.Contents.length === 0) {
            throw new Error('No objects found in the bucket');
        }

        // Randomize URL selection
        const randomIndex = Math.floor(Math.random() * data.Contents.length);
        const selectedObject = data.Contents[randomIndex];
        const url = s3.getSignedUrl('getObject', {
            Bucket: bucketName,
            Key: selectedObject.Key,
            Expires: 60 // URL expiration time in seconds
        });

        return url;
    } catch (error) {
        console.error('Error retrieving objects from S3:', error);
        throw error;
    }
}*/

module.exports = { getRandomDynamoDBItem, writeToDynamoDB, getHowManyCopiesOwned, getCardFromTable, getTotalCards, checkIfUserOwnsCard, changeNumberOwned, addToTotalCardCount, checkTotalCardCount};