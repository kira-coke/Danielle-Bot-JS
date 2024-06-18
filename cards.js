const AWS = require('aws-sdk');
//const s3 = new AWS.S3();
const dynamodb = new AWS.DynamoDB.DocumentClient();

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

module.exports = { getRandomDynamoDBItem };