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
            console.log(`User ${userId} already exists in the table ${tableName}.`);
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
        const value = entry.value ? "Completed" : "Incomplete";
        allAchievements.push({ name, value });
    });

    // Add sorted achievements for Daily Achievements
    sortCategoryAchievements(userAchievements.daily).forEach(entry => {
        const name = `${entry.name} times`;
        const value = entry.value ? "Completed" : "Incomplete";
        allAchievements.push({ name, value });
    });

    // Add sorted achievements for Card Count Achievements
    sortCategoryAchievements(userAchievements.cardcount).forEach(entry => {
        const name = `Reach total ${entry.name}`;
        const value = entry.value ? "Completed" : "Incomplete";
        allAchievements.push({ name, value });
    });

    // Add sorted achievements for Total Experience Achievements
    sortCategoryAchievements(userAchievements.totalexp).forEach(entry => {
        const name = `Reach a ${entry.name}`;
        const value = entry.value ? "Completed" : "Incomplete";
        allAchievements.push({ name, value });
    });
    const totalAchievements = allAchievements.length;
  
    // Calculate number of completed achievements
    const completedAchievements = allAchievements.filter(ach => ach.value === "Completed").length;
  
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

async function checkCardTier(userId, cardId){
  const cardData = await getUserCard("user-cards", userId, cardId);
  const achievementsToUpdate = determineAchievementsToUpdate(cardData[0].tier);
  console.log(achievementsToUpdate);
}

function determineAchievementsToUpdate(cardTier) {
    const milestones = ['tier2', 'tier3', 'tier5', 'tier10', 'tier20', 'tier50'];
    const milestoneIndex = milestones.findIndex(milestone => cardTier >= milestone);

    if (milestoneIndex === -1) {
        return []; 
    } else {
        return milestones.slice(0, milestoneIndex + 1).map(milestone => milestone.replace('tier', 'Tier '));
    }
}


async function checkDaily(cardId, cardId){

}

async function checkCardCount(cardId, cardId){

}

async function checkTotalExp(cardId, cardId){

}

module.exports = {checkUserInTable, checkCardTier, checkDaily, checkCardCount, checkTotalExp, handleCollectorAchievements, achievementsCommand, generateRowAchievements};
