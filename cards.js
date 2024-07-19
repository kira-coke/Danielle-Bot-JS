const AWS = require('aws-sdk');
const {getUser} = require("./users");
//const s3 = new AWS.S3();
const dynamodb = new AWS.DynamoDB.DocumentClient
const {EmbedBuilder, inlineCode} = require("discord.js");
const fs = require('fs');
const axios = require('axios');

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
        if (data.Item.discordCachedUrl) {
            data.Item.cardUrl = data.Item.discordCachedUrl;
        } 
        console.log(data.Item.cardUrl);
        console.log('Retrieved item from DynamoDB:', data.Item);
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
    const cardFromCards = await getCardFromTable("cards",cardData["card-id"]);
    if(cardFromCards.cardRarity != 1){
        console.log("User fav card is custom/le/event.")
        return;
    }
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
    console.log(weightedList[randomIndex]);
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

async function getUserCustomCards(userId) {
    try {
        const customCards = await filterByAttribute("cards", "cardRarity", 4);
        let userOwnedCustomCards = [];
        for (const card of customCards) {
            const userOwns = await checkIfUserOwnsCard("user-cards", userId, card["card-id"]);
            if(userOwns != 0){
                userOwnedCustomCards.push(card);
            }
        }
        return userOwnedCustomCards;
    } catch (error) {
        console.error("Error fetching user custom cards:", error);
        throw error;
    }
}

async function addcardToCards(args, msg){
    const [cardId, cardRarity, cardUrl, groupMember, groupName, theme, version] = args;
    const params = {
        TableName: 'cards',
        Item: {
            'card-id': cardId,
            cardRarity: parseInt(cardRarity), // Assuming cardRarity should be a number
            cardUrl: cardUrl,
            GroupMember: groupMember,
            GroupName: groupName,
            Theme: theme,
            version: parseInt(version), // Assuming version should be a number
        },
        ConditionExpression: 'attribute_not_exists(#cardId)', // Ensure card-id does not already exist
        ExpressionAttributeNames: {
            '#cardId': 'card-id'
        }
    };
    try {
        await dynamodb.put(params).promise();
        msg.reply(`Card '${cardId}' added successfully.`);
    } catch (error) {
        console.error('Error adding card:', error);
        if (error.statusCode === 400) {
            msg.reply('Failed to add card. Likely due to duplicate code.');
        }else{
            msg.reply('Failed to add card. Please try again later.');
        }
    }
}

async function modGiftCard(targetUser, cardIDToGift, msg, copiesToGive){
    let cardData = " ";
    try{
        cardData = await getCardFromTable("cards", cardIDToGift);
    }catch(error){
        msg.reply("Please ensure the card id is valid");
        return;
    }
    if(targetUser){
        let item = {};
        try{
            const totalCount = await getHowManyCopiesOwned("user-cards", targetUser.id, cardIDToGift);
            if(totalCount === 0){
                item = {
                    "user-id": targetUser.id, //primary key
                    "card-id": cardIDToGift, //secondary key
                    exp: 0,
                    level: 0,
                    upgradable: false,
                    "copies-owned": copiesToGive,
                    tier: 1,
                    totalExp: 0
                };
                writeToDynamoDB("user-cards", item)
                .catch((error) => {
                    console.error("Error:", error);
                });
            }else{
                const amount = parseInt(totalCount) + copiesToGive;
                changeNumberOwned("user-cards", targetUser.id, cardIDToGift, amount);
            }
        }catch(error){
            console.log(error);
        }
        const totalOwned = await checkTotalCardCount("Dani-bot-playerbase", targetUser.id)
        await addToTotalCardCount("Dani-bot-playerbase", targetUser.id, parseInt(totalOwned) + copiesToGive);
        const embed = new EmbedBuilder()
            .setColor('#dd2d4a')
            .setTitle('Card Gifted!')
            .setDescription(`<@${targetUser.id}> has been gifted ${inlineCode(copiesToGive)} copies of: ${inlineCode(cardIDToGift)}`)
            .setThumbnail(cardData["cardUrl"])
            .setTimestamp();

        msg.channel.send({ embeds: [embed] });
    }else{
        msg.reply("Please mention a user.")
        return;
    }
}

async function getEventCards(){
    try {
        const scanParams = {
            TableName: "cards",
            FilterExpression: '#rarity = :rarityValue',
            ExpressionAttributeNames: {
                '#rarity': 'cardRarity'
            },
            ExpressionAttributeValues: {
                ':rarityValue': 3
            }
        };
        const data = await dynamodb.scan(scanParams).promise();

        if (!data.Items || data.Items.length === 0) {
            throw new Error('No items found in the table');
        }
        //console.log(data);
        return data.Items;
    } catch (error) {
        console.error('Error retrieving items from DynamoDB:', error);
        throw error;
    }
}

async function storeDiscordCachedUrl(cardId, cachedUrl) {
    const params = {
        TableName: 'cards',
        Key: {
            'card-id': cardId
        },
        UpdateExpression: 'set discordCachedUrl = :url',
        ExpressionAttributeValues: {
            ':url': cachedUrl
        }
    };
    await dynamodb.update(params).promise();
}

async function downloadImage(url, filepath) {
    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream'
    });
    return new Promise((resolve, reject) => {
        const writer = fs.createWriteStream(filepath);
        response.data.pipe(writer);
        let error = null;
        writer.on('error', err => {
            error = err;
            writer.close();
            reject(err);
        });
        writer.on('close', () => {
            if (!error) {
                resolve(filepath);
            }
        });
    });
}



module.exports = { getRandomDynamoDBItem, writeToDynamoDB, getHowManyCopiesOwned, getCardFromTable, getTotalCards, checkIfUserOwnsCard, changeNumberOwned, addToTotalCardCount, checkTotalCardCount, getUserCard, filterByAttribute, getWeightedCard, getCardsWithLevels, addcardToCards, getUserCustomCards, modGiftCard, getEventCards, storeDiscordCachedUrl, downloadImage};