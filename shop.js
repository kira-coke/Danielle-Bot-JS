const { EmbedBuilder, inlineCode, ActionRowBuilder, ButtonBuilder, bold } = require('discord.js');
const {getUser} = require("./users");
const {getRandomDynamoDBItem,getHowManyCopiesOwned,checkIfUserOwnsCard,addToTotalCardCount,checkTotalCardCount, getUserCard, getWeightedCard} = require("./cards");
const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient
const {storePack} = require("./userAssets");

const emote = '<:DB_currency:1257694003638571048>'; 

const shopItems = [
    {
        id: '5_pack',
        name: "Card Pack 5",
        image: 'https://danielle-bot-images.s3.eu-west-2.amazonaws.com/assets/CARDPACK.png',
        price: 10000,
    },
];
const priceWithNumbers = numberWithCommas(shopItems[0].price);

function openShop(msg) {
    const embed = new EmbedBuilder()
        .setTitle('Dani Bot Shop')
        .setDescription("Do **.shop buy [item-id]** to purchase! ")
        .setColor('#fb6f92');

    shopItems.forEach(item => {
          embed.addFields(
              {
                  name: `1️⃣  ${item.name}`,
                  value: '**Price: **' + inlineCode(String(priceWithNumbers)) + `${emote}`,
                  inline: false,
              },
          )
    });
    msg.channel.send({ embeds: [embed] });
}

async function purchaseItem(msg, itemId, userId) {
    const item = shopItems.find(i => i.id === itemId);

    if (!item) {
        return msg.channel.send('Item not found!');
    }

    const embed = new EmbedBuilder()
        .setTitle(`Purchased ${item.name}`)
        .setDescription(`Price: ${inlineCode(String(priceWithNumbers))} ${emote}`)
        .setImage(item.image)
        .setColor('#efcfe3');

    const customId = `open_pack_${msg.id}_${itemId}`;

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(customId)
                .setLabel('Open Pack')
                .setStyle('Secondary')
        );

    const message = await msg.channel.send({ embeds: [embed], components: [row] });
    const filter = interaction => interaction.customId === customId && interaction.user.id === msg.author.id;
    
    const collector = msg.channel.createMessageComponentCollector({ filter, time: 60000});

    collector.on('collect', async interaction => {
        await interaction.deferUpdate();
        if (interaction.customId === customId) {;
            const disabledRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(customId)
                        .setLabel('Open Pack')
                        .setStyle('Secondary')
                        .setDisabled(true)
                );
            await interaction.message.edit({ components: [disabledRow] });
            await packOpen(msg, userId); 
            collector.stop(); 
        }
    });
    collector.on('end', async collected => {
        if (collected.size === 0) {
            try {
                await message.delete();
                msg.channel.send("Button has timed out! Do **.packs** to see all bought packs and do **.pack open** to open");
                const data = await storePack(userId);
                console.log(data);
            } catch (error) {
                console.error('Failed to delete message:', error);
            }
        }
    });
}

async function packOpen(msg, userId) {
    try {
        const user = await getUser(userId);
        const userFavCard = user["FavCard"];
        const userFavCardData = await getUserCard("user-cards", userId, userFavCard);
        const cardData = userFavCardData[0];
        const amount = 5;
        const cardPromises = [];

        for (let i = 0; i < amount; i++) {
            if (cardData === undefined) {
                cardPromises.push(getRandomDynamoDBItem("cards"));
            } else {
                if (cardData.tier >= 2) {
                    cardPromises.push(getWeightedCard(userId));
                } else {
                    cardPromises.push(getRandomDynamoDBItem("cards"));
                }
            }
        }
        const cards = await Promise.all(cardPromises);
        const secondTableName = "user-cards";

        const items = [];
        const cardExistenceChecks = cards.map((randomCard) =>
            checkIfUserOwnsCard(secondTableName, userId, randomCard["card-id"])
        );

        const cardExistenceResults = await Promise.all(cardExistenceChecks);

        for (let i = 0; i < cards.length; i++) {
            const randomCard = cards[i];
            const cardExistsForUser = cardExistenceResults[i];
            const attributeName = randomCard["copies-owned"];
            let item = {};
            let numberOfCopies = 0;

            if (cardExistsForUser === 0) {
                item = {
                    "user-id": userId, //primary key
                    "card-id": randomCard["card-id"], //secondary key
                    exp: 0,
                    level: 0,
                    upgradable: false,
                    "copies-owned": 1,
                    tier: 1,
                    totalExp: 0
                };
                //console.log("Added unowned card to user", randomCard);
            } else {
                const userCard = await getUserCard(secondTableName, userId, randomCard["card-id"]);
                const userCardData = userCard[0];
                numberOfCopies = await getHowManyCopiesOwned(
                    secondTableName,
                    userId,
                    randomCard["card-id"],
                    attributeName,
                );
                item = {
                    "user-id": userId, //primary key
                    "card-id": randomCard["card-id"], //secondary key
                    exp: userCardData.exp,
                    level: userCardData.level,
                    upgradable: false,
                    "copies-owned": numberOfCopies + 1,
                    tier: userCardData.tier,
                    totalExp: userCardData.totalExp,
                };
                //console.log("Added card to user", randomCard);
            }
            items.push(item);
        }
        // Batch write to DynamoDB
        try{
            await writeToDynamoDBBatch(secondTableName, items).catch((error) => {
                console.error("Error in batch writing:", error);
            });
        }catch(error){
            console.log("Error writing batch to dynamodb");
            console.log("Error:", error);
        }
        const cardCount = await checkTotalCardCount("Dani-bot-playerbase", userId).catch((error) => {
            console.error("Error getting total card count:", error);
        });
        addToTotalCardCount("Dani-bot-playerbase", userId, parseInt(cardCount) + amount).catch((error) => {
            console.error("Error updating card count:", error);
        });

        const embed = new EmbedBuilder()
            .setTitle('Pack Opened')
            .setDescription('You have received:')
            .setColor('#8093f1')
            .addFields(cards.map(card => ({
                name: " ",
                value: `${inlineCode(String(card["card-id"]))} ${bold(card["GroupName"])} ${bold(card["GroupMember"])} (${card["Theme"]})`,
                inline: false
            })));

        msg.channel.send({ embeds: [embed] });
    } catch (error) {
        console.error('Error opening pack:', error);
        msg.channel.send('An error occurred while opening the pack. Please try again later.');
    }
}
async function writeToDynamoDBBatch(tableName, items) {
    const batches = [];
    while (items.length) {
        batches.push(items.splice(0, 25));
    }

    const batchPromises = batches.map(async (batch) => {
        const uniqueKeys = new Map(); // Using a Map to store unique keys and their corresponding items
        const batchWriteParams = {
            RequestItems: {
                [tableName]: []
            }
        };

        for (const item of batch) {
            const key = `${item["user-id"]}-${item["card-id"]}`;
            if (uniqueKeys.has(key)) {
                // Item with same key already exists, increment copies-owned
                uniqueKeys.get(key)["copies-owned"] += item["copies-owned"];
            } else {
                // New item, add to uniqueKeys map
                uniqueKeys.set(key, item);
            }
        }

        for (const [key, item] of uniqueKeys) {
            const putRequestItem = {
                PutRequest: {
                    Item: item
                }
            };
            batchWriteParams.RequestItems[tableName].push(putRequestItem);
        }

        // Perform batch write only if there are items to write
        if (batchWriteParams.RequestItems[tableName].length > 0) {
            try {
                await dynamodb.batchWrite(batchWriteParams).promise();
            } catch (error) {
                console.error("Error in batch writing:", error);
                throw error; // Rethrow the error to handle it in the calling function
            }
        }
    });
    return Promise.all(batchPromises);
}

function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

module.exports = {openShop, purchaseItem, packOpen};