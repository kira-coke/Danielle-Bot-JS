const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB.DocumentClient
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, inlineCode, bold} = require("discord.js");
const {changeNumberOwned} = require("./cards");

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
            return {
                embeds: [new EmbedBuilder()
                    .setTitle("Global Trade Station")
                    .setDescription("No trade entries found.")
                ],
                components: [],
                totalPages: 0,
                data: []
            };
        }

        const tradesPerPage = 7;
        const totalPages = Math.ceil(data.length / tradesPerPage);

        const embed = generateTradeStationEmbed(0, totalPages, data);
        const row = generateRow(0, totalPages);

        return {
            embeds: [embed],
            components: [row],
            totalPages,
            data
        };
    } catch (error) {
        console.log("There was an error creating the global trade station embed.");
        console.log("Error:", error);
        throw new Error("Could not create global trade station embed");
    }
}

async function userGlobalTradeStationEmbed(userId) {
    try {
        const data = await getUserGTS(userId);

        if (data.length === 0) {
            return {
                embeds: [new EmbedBuilder()
                    .setTitle("Global Trade Station")
                    .setDescription("No trade entries found.")
                ],
                components: [],
                totalPages: 0,
                data: []
            };
        }

        const tradesPerPage = 7;
        const totalPages = Math.ceil(data.length / tradesPerPage);

        const embed = generateTradeStationEmbed(0, totalPages, data);
        const row = generateRow(0, totalPages);

        return {
            embeds: [embed],
            components: [row],
            totalPages,
            data
        };
    } catch (error) {
        console.log("There was an error creating the global trade station embed.");
        console.log("Error:", error);
        throw new Error("Could not create global trade station embed");
    }
}

async function filteredTradeEmbed(filteredTrades) {
    try {
        if (filteredTrades.length === 0) {
            return {
                embeds: [new EmbedBuilder()
                    .setTitle("Global Trade Station")
                    .setDescription("No trade entries found for the specified filter.")
                ],
                components: [],
                totalPages: 0,
                data: []
            };
        }

        const tradesPerPage = 7;
        const totalPages = Math.ceil(filteredTrades.length / tradesPerPage);

        const embed = generateTradeStationEmbed(0, totalPages, filteredTrades);
        const row = generateRow(0, totalPages);

        return {
            embeds: [embed],
            components: [row],
            totalPages,
            data: filteredTrades
        };
    } catch (error) {
        console.log("There was an error creating the filtered trade station embed.");
        console.log("Error:", error);
        throw new Error("Could not create filtered trade station embed");
    }
}

function handleCollectorGts(embedMessage, msg, totalPages, data) {
    const filter = i => ['previous', 'next'].includes(i.customId) && i.user.id === msg.author.id;
    const collector = embedMessage.createMessageComponentCollector({ filter, time: 60000 });

    let currentPage = 0;

    collector.on('collect', async i => {
        if (i.customId === 'previous') {
            currentPage--;
        } else if (i.customId === 'next') {
            currentPage++;
        }

        const embed = generateTradeStationEmbed(currentPage, totalPages, data);
        const row = generateRow(currentPage, totalPages);

        await i.update({ embeds: [embed], components: [row] });
    });

    collector.on('end', async collected => {
        if (totalPages > 0) {
            const embed = generateTradeStationEmbed(currentPage, totalPages, data);
            const row = generateRow(currentPage, totalPages, true); // Disable the buttons
            await embedMessage.edit({ embeds: [embed], components: [row] });
        }
    });
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
    //console.log(result);
    return result.Items;
  } catch (error) {
    console.log("There was an error fetching the trade entries.");
    console.log("Error:", error);
    throw new Error("Could not fetch trade entries");
  }
}

function generateTradeStationEmbed(page, totalPages, trades, msg) {
    const embed = new EmbedBuilder()
        .setTitle("Global Trade Station")
        .setDescription(`**ID\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0UFT\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0LF**`)
        .setColor("#a4133c");

    const tradesPerPage = 7;
    const start = page * tradesPerPage;
    const end = Math.min(start + tradesPerPage, trades.length);

    for (let i = start; i < end; i++) {
        const trade = trades[i];
        embed.addFields(
            { name: ` `, value: `${inlineCode(trade.globalTradeId)}     ${inlineCode(trade.cardUft)}       ${inlineCode(trade.cardLf)}`, inline: false }
        );
    }

    embed.setFooter({ text: `Page ${page + 1} of ${totalPages}` });

    return embed;
}

function generateRow(page, totalPages, disabled = false) {
    const previousButton = new ButtonBuilder()
        .setCustomId('previous')
        .setLabel('Previous')
        .setStyle('Secondary')
        .setDisabled(disabled || page === 0);

    const nextButton = new ButtonBuilder()
        .setCustomId('next')
        .setLabel('Next')
        .setStyle('Secondary')
        .setDisabled(disabled || page === totalPages - 1);

    return new ActionRowBuilder().addComponents(previousButton, nextButton);
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

async function filterTrades(cardId) {
    try {
        const trades = await getGlobalTradeStationData();
        const filteredTrades = trades.filter(trade => trade["cardUft"] === cardId);
        return filteredTrades;
    } catch (error) {
        console.log("There was an error filtering trades by card ID.");
        console.log("Error:", error);
        throw new Error("Could not filter trades by card ID");
    }
}

async function addToUserInv(userId, cardId, cardCount){
    const count = cardCount + 1;
    await changeNumberOwned("user-cards", userId, cardId, count);
}

async function removeFromUserInv(userId, cardId, cardCount){
    const count = cardCount - 1;
    await changeNumberOwned("user-cards", userId, cardId, count);
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


module.exports = {addToGTS, getUserGTS, getMissingIds, globalTradeStationEmbed, getTradeByGlobalTradeId, deleteTradeByGlobalTradeId, addToUserInv, removeFromUserInv, userGlobalTradeStationEmbed, handleCollectorGts, filterTrades, filteredTradeEmbed};