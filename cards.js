const AWS = require('aws-sdk');
const {getUser} = require("./users");
//const s3 = new AWS.S3();
const dynamodb = new AWS.DynamoDB.DocumentClient

async function getRandomDynamoDBItem(tableName) {
    try {
        // Scan the table to get all items
        const scanParams = {
            TableName: tableName,
            FilterExpression: '#rarity = :rarityValue',
            ExpressionAttributeNames: {
                '#rarity': 'cardRarity'
            },
            ExpressionAttributeValues: {
                ':rarityValue': 1
            }
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
        //console.log('Item successfully added to DynamoDB:', data);
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

async function getUserCard(tableName, key, secondaryKeyValue){
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
        return data.Items;
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
            TableName: tableName,
            FilterExpression: '#rarity = :rarityValue',
            ExpressionAttributeNames: {
                '#rarity': 'cardRarity'
            },
            ExpressionAttributeValues: {
                ':rarityValue': 1
            }
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

async function filterByAttribute(tableName, attribute, value) {
    const params = {
        TableName: tableName,
        FilterExpression: `#attr = :val`,
        ExpressionAttributeNames: {
            '#attr': attribute
        },
        ExpressionAttributeValues: {
            ':val': value
        }
    };

    try {
        const data = await dynamodb.scan(params).promise();
        return data.Items;
    } catch (error) {
        console.error('Error filtering items:', error);
        throw error;
    }
}

async function getWeightedCard(userId){
    const user = await getUser(userId);
    const userFavCard = user["FavCard"];
    const userFavCardData = await getUserCard("user-cards",userId,userFavCard);
    const cardData = userFavCardData[0];
    let cardWeights = {};
    if(cardData === undefined){
    }else{
        if(cardData.tier === 2){
            cardWeights = {
                [userFavCard]: 2, 
            };
        }
        if(cardData.tier >= 3){
            cardWeights = {
                [userFavCard]: 3, 
            };
        }
    }

    const allCards = await getTotalCards("cards"); // Function to get all cards from the table
    if (!Array.isArray(allCards.Items)) {
        console.error("Expected an array but received:", allCards);
        throw new TypeError("Expected an array of cards");
    }
    const weightedList = [];

    allCards.Items.forEach(card => {
        const weight = cardWeights[[card["card-id"]]] || 1; ; // Default weight is 1 if not specified
        for (let i = 0; i < weight; i++) {
            weightedList.push(card);
        }
    });
    const randomIndex = Math.floor(Math.random() * weightedList.length);
    return weightedList[randomIndex];

}

async function getCardsWithLevels(tableName, userId) {
    const params = {
        TableName: tableName,
        KeyConditionExpression: '#userId = :userId',
        FilterExpression: '#lvl > :level',
        ExpressionAttributeNames: {
            '#userId': 'user-id',
            '#lvl': 'level'
        },
        ExpressionAttributeValues: {
            ':userId': userId,
            ':level': 1
        }
    };

    try {
        const data = await dynamodb.query(params).promise();
        return data.Items;
    } catch (err) {
        console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
        throw new Error('Error querying the database');
    }
}

module.exports = { getRandomDynamoDBItem, writeToDynamoDB, getHowManyCopiesOwned, getCardFromTable, getTotalCards, checkIfUserOwnsCard, changeNumberOwned, addToTotalCardCount, checkTotalCardCount, getUserCard, filterByAttribute, getWeightedCard, getCardsWithLevels};