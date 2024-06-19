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

async function getHowManyCopiesOwned(tableName, primaryKeyValue, attributeName) {
    try {
        const params = {
            TableName: tableName,
            KeyConditionExpression: '#pk = :pkValue',
            FilterExpression: '#attr = :attrValue',
            ExpressionAttributeNames: {
                '#pk': 'user-id',   // Replace with your partition key attribute name
                '#attr': 'card-id' // Replace with the attribute name you want to count instances of
            },
            ExpressionAttributeValues: {
                ':pkValue': primaryKeyValue,
                ':attrValue': attributeName,
            },
            Select: 'COUNT'  // Count the number of items matching the condition
        };

        // Call DynamoDB query API to count items
        const data = await dynamodb.query(params).promise();
       // console.log(data);

        // The count of items with the same secondary key
        const count = data.Count || 0;
        console.log(`Number of instances of ${attributeName} for userId ${primaryKeyValue}:`, count);
        return count;
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
        console.log('Retrieved item from DynamoDB:', data.Item);
        return data.Item; // Return the retrieved item
    } catch (error) {
        //console.error('Error retrieving item from DynamoDB:', error);
        throw error;
    }
}

async function getNewCardId(tableName){
    //get highest numvber, and return it + 1
    const botName = "Danielle Bot";
    const sortKeyAttribute  = 'nextCardID'
    try {
        const params = {
            TableName: tableName,
            KeyConditionExpression: '#pk = :pkValue',
            ExpressionAttributeNames: {
                '#pk': 'botName', // Replace with your partition key attribute name
                '#sk': sortKeyAttribute // Replace with your sort key attribute name
            },
                ExpressionAttributeValues: {
                    ':pkValue': botName,
                },
                ScanIndexForward: false, // Set to false to get the highest value first
                Limit: 1 // Limit to the top item
            };

        // Call DynamoDB getItem API
        const data = await dynamodb.query(params).promise();

        if (!data.Items) {
            throw new Error('Item not found in DynamoDB');
        }
        console.log('Retrieved item from DynamoDB:', data.Items);
        return data.Items; // Return the retrieved item
        
        }catch (error) {
        console.error('Error retrieving item from DynamoDB:', error);
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

module.exports = { getRandomDynamoDBItem, writeToDynamoDB, getHowManyCopiesOwned, getCardFromTable, getNewCardId };