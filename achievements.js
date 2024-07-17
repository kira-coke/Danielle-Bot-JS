const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient
const { ActionRowBuilder, ButtonBuilder, EmbedBuilder, inlineCode } = require("discord.js");
const {getUserCard} = require("./cards.js");

async function checkUserInTable(userId) {
    const tableName = 'achievements';
    const params = {
        TableName: tableName,
        Key: {
          'user-id': userId
        }
    };

    try {
        const data = await dynamodb.get(params).promise();
        if (!data.Item) {
            const newUser = {
              "user-id": userId,
              tier: {
                "Tier 2": false,
                "Tier 3": false,
                "Tier 5": false,
                "Tier 10": false,
                "Tier 20": false,
                "Tier 50": false,
              },
              daily: {
                "Daily 10": false,
                "Daily 20": false,
                "Daily 40": false,
                "Daily 100": false,
                "Daily 365": false,
                "Daily 730": false,
              },
              cardcount: {
                "Card Count 1000": false,
                "Card Count 2500": false,
                "Card Count 5000": false,
                "Card Count 10000": false,
                "Card Count 20000": false,
                "Card Count 50000": false,
              },
              totalexp: {
                "Total Exp 5000": false,
                "Total Exp 10000": false,
                "Total Exp 20000": false,
                "Total Exp 50000": false,
                "Total Exp 200000": false,
                "Total Exp 500000": false,
              },
            };

            const putParams = {
                TableName: tableName,
                Item: newUser
            };

            await dynamodb.put(putParams).promise();
            console.log(`User ${userId} added to the table ${tableName}.`);
            return newUser;
        } else {
            //console.log(`User ${userId} already exists in the table ${tableName}.`);
            return data.Item;
        }
    } catch (error) {
        console.error("Error checking or adding user: ", error);
    }
}

function achievementsCommand(userAchievements, page) {
    const allAchievements = [];

    // Function to sort achievements within each category
    const sortCategoryAchievements = (categoryAchievements) => {
        return Object.keys(categoryAchievements)
            .map(key => ({ name: key, value: categoryAchievements[key] }))
            .sort((a, b) => {
                // Extract numeric parts from achievement names
                const numA = parseInt(a.name.replace(/\D/g, ''), 10);
                const numB = parseInt(b.name.replace(/\D/g, ''), 10);
  
                // Compare numeric parts
                if (numA < numB) return -1;
                if (numA > numB) return 1;
  
                // If numeric parts are equal, compare as strings
                const nameA = a.name.toLowerCase();
                const nameB = b.name.toLowerCase();
                if (nameA < nameB) return -1;
                if (nameA > nameB) return 1;
                return 0;
            });
    };

    // Add sorted achievements for Tier Achievements
    sortCategoryAchievements(userAchievements.tier).forEach(entry => {
        const name = `Reach ${entry.name} on 1 card`;
        const value = entry.value ? "✅" : "Incomplete";
        allAchievements.push({ name, value });
    });

    // Add sorted achievements for Daily Achievements
    sortCategoryAchievements(userAchievements.daily).forEach(entry => {
        const name = `${entry.name} times`;
        const value = entry.value ? "✅" : "Incomplete";
        allAchievements.push({ name, value });
    });

    // Add sorted achievements for Card Count Achievements
    sortCategoryAchievements(userAchievements.cardcount).forEach(entry => {
        const name = `Reach total ${entry.name}`;
        const value = entry.value ? "✅" : "Incomplete";
        allAchievements.push({ name, value });
    });

    // Add sorted achievements for Total Experience Achievements
    sortCategoryAchievements(userAchievements.totalexp).forEach(entry => {
        const name = `Reach a ${entry.name}`;
        const value = entry.value ? "✅" : "Incomplete";
        allAchievements.push({ name, value });
    });
    const totalAchievements = allAchievements.length;
  
    // Calculate number of completed achievements
    const completedAchievements = allAchievements.filter(ach => ach.value === "✅").length;
  
    // Progress tracker
    const progressTracker = `${completedAchievements}/${totalAchievements}`;

    const itemsPerPage = 6;
    const startIdx = page * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    const newPageAchievements = allAchievements.slice(startIdx, endIdx);
    const totalPages = Math.ceil(allAchievements.length / itemsPerPage);

    const embed = new EmbedBuilder()
        .setColor("#8a2846")
        .setTitle(`Your achievement progress: ${inlineCode(progressTracker)}`)
        .addFields(newPageAchievements.map(ach => ({ name: ach.name, value: inlineCode(ach.value) })))
        .setFooter({ text: `Page ${page + 1} of ${totalPages}` })
        .setTimestamp();

    return { embed, totalPages };
}

function generateRowAchievements(currentPage, totalPages) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("previous")
            .setLabel("Previous")
            .setStyle("Secondary")
            .setDisabled(currentPage === 0),
        new ButtonBuilder()
            .setCustomId("next")
            .setLabel("Next")
            .setStyle("Secondary")
            .setDisabled(currentPage === totalPages - 1)
    );
}

function handleCollectorAchievements(embedMessage, msg, userAchievements, totalPages) {
    let currentPage = 0;
    const filter = (i) => i.user.id === msg.author.id;
    const collector = embedMessage.createMessageComponentCollector({ filter, time: 60000 });

    collector.on("collect", async (i) => {
        await i.deferUpdate();
        if (i.customId === "previous" && currentPage > 0) {
            currentPage--;
        } else if (i.customId === "next" && currentPage < totalPages - 1) {
            currentPage++;
        }

        const result = achievementsCommand(userAchievements, currentPage);
        const newEmbed = result.embed;
        totalPages = result.totalPages;  // Update totalPages
  
        await embedMessage.edit({ embeds: [newEmbed], components: [generateRowAchievements(currentPage, totalPages)] });
      });

    collector.on("end", () => {
        embedMessage.edit({ components: [] }).catch(console.error);
    });
}

async function checkCardTier(userId, cardId, msg) {
    const cardData = await getUserCard("user-cards", userId, cardId);
    const achievementsToUpdate = determineTiersToUpdate(cardData[0].tier);
    const userAchievements = await checkUserInTable(userId);
    const achievementsToActuallyUpdate = achievementsToUpdate.filter(
        (achievement) => !userAchievements.tier[achievement],
    );
    if (achievementsToActuallyUpdate.length > 0) {
        await updateTierAchievements(userId, achievementsToActuallyUpdate);
        msg.reply("You have recieved achievement rewards for: " + achievementsToActuallyUpdate.join(", "));
    } else {
        console.log(`No new achievements to update for user ${userId}.`);
    }
}

function determineTiersToUpdate(cardTier) {
    const milestones = [
        { key: 'Tier 2', value: 2 },
        { key: 'Tier 3', value: 3 },
        { key: 'Tier 5', value: 5 },
        { key: 'Tier 10', value: 10 },
        { key: 'Tier 20', value: 20 },
        { key: 'Tier 50', value: 50 }
    ];

    const achievementsToUpdate = milestones
        .filter(milestone => cardTier >= milestone.value)
        .map(milestone => milestone.key);

    return achievementsToUpdate;
}

async function updateTierAchievements(userId, achievementsToUpdate) {
    const tableName = 'achievements';

    // Create an expression to update multiple fields dynamically
    let updateExpression = 'SET ';
    const ExpressionAttributeNames = {};
    const ExpressionAttributeValues = {};

    achievementsToUpdate.forEach((achievement, index) => {
        const attrName = `#tier${index}`;
        const attrValue = `:value${index}`;
        updateExpression += `tier.${attrName} = ${attrValue}, `;
        ExpressionAttributeNames[attrName] = achievement;
        ExpressionAttributeValues[attrValue] = true;
    });

    // Remove the last comma and space from the updateExpression
    updateExpression = updateExpression.slice(0, -2);

    const params = {
        TableName: tableName,
        Key: {
            'user-id': userId
        },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames,
        ExpressionAttributeValues
    };

    try {
        await dynamodb.update(params).promise();
        console.log(`User ${userId}'s achievements updated:`, achievementsToUpdate);
    } catch (error) {
        console.error("Error updating achievements: ", error);
    }
}

async function checkDaily(userId, dailyCount, msg){
    const achievementsToUpdate = determineDailyToUpdate(dailyCount);
    const userAchievements = await checkUserInTable(userId);

    const achievementsToActuallyUpdate = achievementsToUpdate.filter(achievement => !userAchievements.daily[achievement]);

    if (achievementsToActuallyUpdate.length > 0) {
        await updateDailyAchievements(userId, achievementsToActuallyUpdate);
        msg.reply("You have recieved achievement rewards for: " + achievementsToActuallyUpdate.join(", "));
    } else {
        console.log(`No new daily achievements to update for user ${userId}.`);
    }
}

function determineDailyToUpdate(dailyCount) {
    const milestones = [
        { key: 'Daily 10', value: 10 },
        { key: 'Daily 20', value: 20 },
        { key: 'Daily 40', value: 40 },
        { key: 'Daily 100', value: 100 },
        { key: 'Daily 365', value: 365 },
        { key: 'Daily 730', value: 730 }
    ];

    const achievementsToUpdate = milestones
        .filter(milestone => dailyCount >= milestone.value)
        .map(milestone => milestone.key);

    return achievementsToUpdate;
}

async function updateDailyAchievements(userId, achievementsToUpdate) {
    const tableName = 'achievements';

    // Create an expression to update multiple fields dynamically
    let updateExpression = 'SET ';
    const ExpressionAttributeNames = {};
    const ExpressionAttributeValues = {};

    achievementsToUpdate.forEach((achievement, index) => {
        const attrName = `#daily${index}`;
        const attrValue = `:value${index}`;
        updateExpression += `daily.${attrName} = ${attrValue}, `;
        ExpressionAttributeNames[attrName] = achievement;
        ExpressionAttributeValues[attrValue] = true;
    });

    // Remove the last comma and space from the updateExpression
    updateExpression = updateExpression.slice(0, -2);

    const params = {
        TableName: tableName,
        Key: {
            'user-id': userId
        },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames,
        ExpressionAttributeValues
    };

    try {
        await dynamodb.update(params).promise();
        console.log(`User ${userId}'s daily achievements updated:`, achievementsToUpdate);
    } catch (error) {
        console.error("Error updating achievements: ", error);
    }
}

async function checkCardCount(userId, cardCount, msg){
    const achievementsToUpdate = determineCardCountToUpdate(cardCount);
    const userAchievements = await checkUserInTable(userId);

    const achievementsToActuallyUpdate = achievementsToUpdate.filter(achievement => !userAchievements.cardcount[achievement]);

    if (achievementsToActuallyUpdate.length > 0) {
        await updateCardCountAchievements(userId, achievementsToActuallyUpdate);
        msg.reply("You have recieved achievement rewards for: " + achievementsToActuallyUpdate.join(", "));
    } else {
        console.log(`No new card count achievements to update for user ${userId}.`);
    }
}

function determineCardCountToUpdate(cardCount) {
    const milestones = [
        { key: 'Card Count 1000', value: 1000 },
        { key: 'Card Count 2500', value: 2500 },
        { key: 'Card Count 5000', value: 5000 },
        { key: 'Card Count 10000', value: 10000 },
        { key: 'Card Count 20000', value: 20000 },
        { key: 'Card Count 50000', value: 50000 }
    ];

    const achievementsToUpdate = milestones
        .filter(milestone => cardCount >= milestone.value)
        .map(milestone => milestone.key);

    return achievementsToUpdate;
}

async function updateCardCountAchievements(userId, achievementsToUpdate) {
    const tableName = 'achievements';

    // Create an expression to update multiple fields dynamically
    let updateExpression = 'SET ';
    const ExpressionAttributeNames = {};
    const ExpressionAttributeValues = {};

    achievementsToUpdate.forEach((achievement, index) => {
        const attrName = `#cardcount${index}`;
        const attrValue = `:value${index}`;
        updateExpression += `cardcount.${attrName} = ${attrValue}, `;
        ExpressionAttributeNames[attrName] = achievement;
        ExpressionAttributeValues[attrValue] = true;
    });

    // Remove the last comma and space from the updateExpression
    updateExpression = updateExpression.slice(0, -2);

    const params = {
        TableName: tableName,
        Key: {
            'user-id': userId
        },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames,
        ExpressionAttributeValues
    };

    try {
        await dynamodb.update(params).promise();
        console.log(`User ${userId}'s card count achievements updated:`, achievementsToUpdate);
    } catch (error) {
        console.error("Error updating achievements: ", error);
    }
}

async function checkTotalExp(userId, totalExp, msg){
    const achievementsToUpdate = determineTotalExpToUpdate(totalExp);
    const userAchievements = await checkUserInTable(userId);

    // Filter out achievements that are already true
    const achievementsToActuallyUpdate = achievementsToUpdate.filter(achievement => !userAchievements.totalexp[achievement]);

    if (achievementsToActuallyUpdate.length > 0) {
        await updateTotalExpAchievements(userId, achievementsToActuallyUpdate);
        msg.reply("You have recieved achievement rewards for: " + achievementsToActuallyUpdate.join(", "));
    } else {
        console.log(`No new total experience achievements to update for user ${userId}.`);
    }
}

function determineTotalExpToUpdate(totalExp) {
    const milestones = [
        { key: 'Total Exp 5000', value: 5000 },
        { key: 'Total Exp 10000', value: 10000 },
        { key: 'Total Exp 20000', value: 20000 },
        { key: 'Total Exp 50000', value: 50000 },
        { key: 'Total Exp 200000', value: 200000 },
        { key: 'Total Exp 500000', value: 500000 }
    ];

    const achievementsToUpdate = milestones
        .filter(milestone => totalExp >= milestone.value)
        .map(milestone => milestone.key);

    return achievementsToUpdate;
}

async function updateTotalExpAchievements(userId, achievementsToUpdate) {
    const tableName = 'achievements';

    // Create an expression to update multiple fields dynamically
    let updateExpression = 'SET ';
    const ExpressionAttributeNames = {};
    const ExpressionAttributeValues = {};

    achievementsToUpdate.forEach((achievement, index) => {
        const attrName = `#totalexp${index}`;
        const attrValue = `:value${index}`;
        updateExpression += `totalexp.${attrName} = ${attrValue}, `;
        ExpressionAttributeNames[attrName] = achievement;
        ExpressionAttributeValues[attrValue] = true;
    });

    // Remove the last comma and space from the updateExpression
    updateExpression = updateExpression.slice(0, -2);

    const params = {
        TableName: tableName,
        Key: {
            'user-id': userId
        },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames,
        ExpressionAttributeValues
    };

    try {
        await dynamodb.update(params).promise();
        console.log(`User ${userId}'s total experience achievements updated:`, achievementsToUpdate);
    } catch (error) {
        console.error("Error updating achievements: ", error);
    }
}

module.exports = {checkUserInTable, checkCardTier, checkDaily, checkCardCount, checkTotalExp, handleCollectorAchievements, achievementsCommand, generateRowAchievements};
