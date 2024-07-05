const Discord = require("discord.js");
const {calculateLevelUpXP} = require("./cardExpSystem.js");
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require("discord.js");
const { getCardFromTable, checkIfUserOwnsCard, getUserCard} = require("./cards.js");
const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB.DocumentClient

async function generateEmbedInv(page, totalPages, listOfCards, msg, userId) {

    let user;
    try {
        user = await msg.client.users.fetch(userId);
    } catch (error) {
        console.error("Failed to fetch user:", error); // Log error if fetching fails
        throw error;
    }
    const embed = new EmbedBuilder()
        .setTitle(
            `Displaying ${user.username}'s inventory                                        (Page ${page + 1}/${totalPages})`,
        )
        .setColor("#feb69e")
        .setFooter({
            text: msg.author.tag,
            iconURL: msg.author.displayAvatarURL({
                dynamic: true,
            }),
        });

    const cardsPerPage = 10; // Ensure this matches the value in the index constant too otherwise will end up with extra blank pages
    const startIndex = page * cardsPerPage;
    const endIndex = Math.min(
        startIndex + cardsPerPage,
        listOfCards.length,
    );

    const cardSubset = listOfCards.slice(startIndex, endIndex);

    for (const attribute of cardSubset) {
        try {
            const card = await getCardFromTable("cards", attribute["card-id"]);

            const ownsCard = await checkIfUserOwnsCard("user-cards", userId, attribute["card-id"]);

            if (ownsCard !== 0) {
                const cardDataArray = await getUserCard("user-cards", userId, attribute["card-id"]);
                const cardData = cardDataArray[0];
                embed.addFields(
                    { 
                        name: " ", 
                        value: `${Discord.blockQuote(Discord.inlineCode(String(card["card-id"])))} ${Discord.bold(String(card["GroupMember"]))} (${Discord.bold(String(card["Theme"]))}) ${Discord.inlineCode(String(cardData.exp) + "/100")} | ${Discord.inlineCode("Tier "+String(cardData.tier))} | ${Discord.inlineCode("Lvl." + String(cardData.level))} | ${Discord.inlineCode(String(cardData["copies-owned"]))}`, 
                        inline: false 
                    }
                );
            } else {
                //console.log("User does not own: " + attribute["card-id"]);
            }
        } catch (error) {
            console.error("Error processing card:", error);
            // Optionally handle error or continue with next card
        }
    }

    return embed;
};

async function generateEmbedInvForGroup(page, totalPages, listOfCards, msg, userId) {
  
    let user;
    try {
        user = await msg.client.users.fetch(userId);
    } catch (error) {
        console.error("Failed to fetch user:", error); // Log error if fetching fails
        throw error;
    }
    const embed = new EmbedBuilder()
        .setTitle(
            `Displaying ${user.username}'s inventory                                        (Page ${page + 1}/${totalPages})`,
        )
        .setColor("#feb69e")
        .setFooter({
            text: msg.author.tag,
            iconURL: msg.author.displayAvatarURL({
                dynamic: true,
            }),
        });

    const cardsPerPage = 10; // Ensure this matches the value in the index constant too otherwise will end up with extra blank pages
    const startIndex = page * cardsPerPage;
    const endIndex = Math.min(
        startIndex + cardsPerPage,
        listOfCards.length,
    );

    const cardSubset = listOfCards.slice(startIndex, endIndex);
    
    for (const attribute of cardSubset) {
        try {
            const card = await getCardFromTable("cards", attribute["card-id"]);

            const ownsCard = await checkIfUserOwnsCard("user-cards", userId, attribute["card-id"]);

            if (ownsCard !== 0) {
                const cardDataArray = await getUserCard("user-cards", userId, attribute["card-id"]);
                const cardData = cardDataArray[0];
                const levelUpExp = calculateLevelUpXP(cardData.level);
                embed.addFields(
                    { 
                        name: " ", 
                        value: `${Discord.blockQuote(Discord.inlineCode(String(card["card-id"])))} ${Discord.bold(String(card["GroupMember"]))} (${Discord.bold(String(card["Theme"]))}) ${Discord.inlineCode(String(cardData.exp))}/${Discord.inlineCode(levelUpExp)} | ${Discord.inlineCode("Tier "+String(cardData.tier))} | ${Discord.inlineCode("Lvl." + String(cardData.level))} | ${Discord.inlineCode(String(cardData["copies-owned"]))}`, 
                        inline: false 
                    }
                );
            } else {
                embed.addFields(
                    { 
                        name: " ", 
                        value: `**User does not own:** ${Discord.inlineCode(attribute["card-id"])}`, 
                        inline: false 
                    }
                );
            }
        } catch (error) {
            console.error("Error processing card:", error);
        }
    }

    return embed;
};

const generateRowInv = (page, totalPages) => {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("prev")
            .setLabel("◀")
            .setStyle("Secondary")
            .setDisabled(page === 0),
        new ButtonBuilder()
            .setCustomId("next")
            .setLabel("▶")
            .setStyle("Secondary")
            .setDisabled(page === totalPages - 1),
    );
};

const handleCollectorInv = (embedMessage, msg, totalPages, listOfCards, userId) => {
    let currentPage = 0;
    const filter = (i) => i.user.id === msg.author.id;
    const collector = embedMessage.createMessageComponentCollector({
        filter,
        time: 60000, // How long buttons last
    });

    collector.on("collect", async (i) => {
        await i.deferUpdate();
        if (i.customId === "prev" && currentPage > 0) {
            currentPage--;
        } else if (i.customId === "next" && currentPage < totalPages - 1) {
            currentPage++;
        }
        await embedMessage.edit({
            embeds: [await generateEmbedInv(currentPage, totalPages, listOfCards, msg, userId)],
            components: [generateRowInv(currentPage, totalPages)],
        });
    });

    collector.on("end", (collected) => {
        embedMessage.edit({ components: [] });
    });
};

const handleCollectorInvForGroup = (embedMessage, msg, totalPages, listOfCards, userId) => {
    let currentPage = 0;
    const filter = (i) => i.user.id === msg.author.id;
    const collector = embedMessage.createMessageComponentCollector({
        filter,
        time: 30000, // How long buttons last
    });

    collector.on("collect", async (i) => {
        await i.deferUpdate();
        if (i.customId === "prev" && currentPage > 0) {
            currentPage--;
        } else if (i.customId === "next" && currentPage < totalPages - 1) {
            currentPage++;
        }
        await embedMessage.edit({
            embeds: [await generateEmbedInvForGroup(currentPage, totalPages, listOfCards, msg, userId)],
            components: [generateRowInv(currentPage, totalPages)],
        });
    });

    collector.on("end", (collected) => {
        embedMessage.edit({ components: [] });
    });
};

async function getUniqueGroupNames(tableName) {
    let params = {
        TableName: tableName,
        ProjectionExpression: 'GroupName'
    };

    let uniqueGroupNames = new Set();
    async function scanDynamoDB(lastEvaluatedKey = null) {
        if (lastEvaluatedKey) {
            params.ExclusiveStartKey = lastEvaluatedKey;
        }

        try {
            const data = await dynamodb.scan(params).promise();
            data.Items.forEach(item => {
                if (item["GroupName"]) {
                    uniqueGroupNames.add(item["GroupName"]);
                }
            });

            if (data.LastEvaluatedKey) {
                await scanDynamoDB(data.LastEvaluatedKey);
            }
        } catch (err) {
            console.error('Unable to scan the table. Error JSON:', JSON.stringify(err, null, 2));
        }
    }

    // Initiate the scan
    await scanDynamoDB();
    return Array.from(uniqueGroupNames);
}

module.exports = { generateEmbedInv, generateEmbedInvForGroup, generateRowInv, handleCollectorInv, getUniqueGroupNames, handleCollectorInvForGroup  };
