const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB.DocumentClient
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, inlineCode, bold} = require("discord.js");

async function getGlobalTradeStationData() {
    const params = {
        TableName: "globalTradeStation"
    };

    try {
        const result = await dynamodb.scan(params).promise();
        return result.Items;
    } catch (error) {
        console.log("There was an error fetching the global trade station data.");
        console.log("Error:", error);
        throw new Error("Could not fetch global trade station data");
    }
}

async function globalTradeStationEmbed() {
    try {
        const data = await getGlobalTradeStationData();

        if (data.length === 0) {
            return new EmbedBuilder()
                .setTitle("Global Trade Station")
                .setDescription("No trade entries found.");
        }

        const embed = new EmbedBuilder()
            .setTitle("Global Trade Station")
            .setColor("#a4133c")
            .setDescription("Here are the current trades:");

        data.forEach(trade => {
          embed.addFields(
              { name: `Trade ID: ${trade.globalTradeId}` , value: `Card UFT: ${inlineCode(trade.cardUft)}\nCard LF: ${inlineCode(trade.cardLf)}`, inline: false }
          );
        });

        return embed;
    } catch (error) {
        console.log("There was an error creating the global trade station embed.");
        console.log("Error:", error);
        throw new Error("Could not create global trade station embed");
    }
}

async function getUserGTS(userId){
  const params = {
      TableName: "globalTradeStation",
      KeyConditionExpression: "#uid = :uid",
      ExpressionAttributeNames: {
          "#uid": "user-id"
      },
      ExpressionAttributeValues: {
          ":uid": userId
      }
  };
  try {
    const result = await dynamodb.query(params).promise();
    return result.Items;
  } catch (error) {
    console.log("There was an error fetching the trade entries.");
    console.log("Error:", error);
    throw new Error("Could not fetch trade entries");
  }
}

async function addToGTS(userId, tradeId, cardUft, cardLf, timestamp){
  const globalId = generateShortId(); // Function to generate a shorter ID or name
  let isUnique = false;
    while (!isUnique) {
      // Check if globalTradeId already exists in globalTradeStation table
      const params = {
          TableName: "globalTradeStation",
          FilterExpression: "globalId = :gId",
          ExpressionAttributeValues: {
              ":gId": globalId
          }
      };

      try {
          // Perform a scan to find if the globalTradeId exists
          const data = await dynamodb.scan(params).promise();

          if (data.Items.length === 0) {
              isUnique = true; // ID is unique if no items found
          } else {
              // If ID exists, generate a new one and check again
              globalTradeId = generateShortId();
          }
      } catch (error) {
          console.log("Error checking for uniqueness of globalTradeId:", error);
          throw error;
      }
  }
  const params = {
      TableName: "globalTradeStation",
      Item: {
          "user-id": userId,
          "trade-id": tradeId,
          globalTradeId: globalId,
          cardUft: cardUft,
          cardLf: cardLf,
          timestamp: timestamp
      },
  };

  
  try {
    await dynamodb.put(params).promise();
    console.log("Trade entry created successfully.");
  } catch (error) {
    console.log("There was an error creating the trade entry. Please try again later.");
    console.log("Error:", error);
  }
}

async function getTradeByGlobalTradeId(globalTradeId) {
    const params = {
        TableName: "globalTradeStation",
        FilterExpression: "globalTradeId = :gId",
        ExpressionAttributeValues: {
            ":gId": globalTradeId
        }
    };

    try {
        const data = await dynamodb.scan(params).promise();
        return data.Items; // Returns array of items matching the globalTradeId
    } catch (error) {
        console.error("Error scanning DynamoDB table:", error);
        throw error;
    }
}

async function deleteTradeByGlobalTradeId(tradeId) {
  console.log(tradeId);
    try {
        const trade = await getTradeByGlobalTradeId(tradeId);

        if (trade.length !== 1) {
            throw new Error(`Expected exactly one trade for tradeId ${tradeId}, found ${trade.length}`);
        }

        const userId = trade[0]["user-id"];
        const tradeIdToDelete = trade[0]["trade-id"];

        const deleteParams = {
            TableName: "globalTradeStation",
            Key: {
                "user-id": userId,
                "trade-id": tradeIdToDelete
            }
        };

        await dynamodb.delete(deleteParams).promise();
        console.log(`Successfully deleted trade with tradeId ${tradeIdToDelete}`);
    } catch (error) {
        console.error(`Error deleting trade with tradeId ${tradeId}:`, error);
        throw error;
    }
}


function getMissingIds(data) {
  // Extract trade-ids and convert to integers
  const tradeIds = data.map(item => parseInt(item['trade-id'], 10));

  // Create an array for numbers 1 to 10
  const allIds = Array.from({ length: 10 }, (_, i) => i + 1);

  // Find missing numbers by filtering out existing trade-ids
  const missingIds = allIds.filter(id => !tradeIds.includes(id));

  return missingIds;
}

function generateShortId(length = 6) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';

    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    return result;
}

module.exports = {addToGTS, getUserGTS, getMissingIds, globalTradeStationEmbed, getTradeByGlobalTradeId, deleteTradeByGlobalTradeId};