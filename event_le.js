const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient
const { getEventCards, getUserCard, checkIfUserOwnsCard, writeToDynamoDB, checkTotalCardCount, addToTotalCardCount, getHowManyCopiesOwned } = require("./cards");
const {removeEventRoll} = require ("./userAssets");
const { ActionRowBuilder, ButtonBuilder, EmbedBuilder, inlineCode } = require("discord.js");
const emote = '<:event_roll:1261060311813718187>'; 

async function eventRoll(userId, eventRollMessage) {
    const eventCards = await getEventCards();
    const themeName = "Angel or Devil?"; // Replace depending on event 

    const filteredCards = eventCards.filter(card => card.Theme === themeName);
    const randomIndex = Math.floor(Math.random() * filteredCards.length);
    const randomCard = filteredCards[randomIndex];

    console.log("Randomly selected card:", randomCard);
    await removeEventRoll(userId);
    await removeEventRoll(userId);
    const secondTableName = "user-cards";
    const attributeName = randomCard["copies-owned"];
    let item = {};
    let numberOfCopies = 0;
    const cardExistsForUser = await checkIfUserOwnsCard(
        secondTableName,
        userId,
        randomCard["card-id"],
    );
    const userCard = await getUserCard(secondTableName, userId, randomCard["card-id"]);
    const userCardData = userCard[0];
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
    } else {
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
    }
    const cardCount = await checkTotalCardCount(
        "Dani-bot-playerbase",
        userId,
    ).catch((error) => {
        console.error(
            "Error getting total card count:",
            error,
        );
    });
    addToTotalCardCount(
        "Dani-bot-playerbase",
        userId,
        parseInt(cardCount) + 1,
    ).catch((error) => {
        console.error("Error updating card count:", error);
    });
    writeToDynamoDB(secondTableName, item)
        .catch((error) => {
            console.error("Error:", error);
        });
  
    const cardEmbed = new EmbedBuilder()
        .setTitle("You received an event card!")
        .setDescription(
            `**${inlineCode(randomCard["card-id"])} ${randomCard["GroupName"]} ${randomCard["GroupMember"]}** (${randomCard["Theme"]})`,
        )
        .addFields(
            {
                name: `Copies now Owned: ${inlineCode(
                    String(parseInt(numberOfCopies) + 1))}`,
                value: " ",
                inline: true,
            }, // You can set inline to true if you want the field to display inline.
        )
        .setImage(randomCard["cardUrl"])
        .setColor("#cdb4db")
        .setFooter({
          text: eventRollMessage.author.tag,
          iconURL: eventRollMessage.author.displayAvatarURL({
              dynamic: true,
          }),
        })
        .setTimestamp();
      
    // Update the existing message with the card embed
    await eventRollMessage.edit({ embeds: [cardEmbed], components: [] });
}

async function initiateEventRoll(userId, msg) {
    const eventRollEmbed = new EmbedBuilder()
        .setTitle("Event Roll")
        .setDescription(`Are you sure you want to use 2 tokens for a random event card? ${emote}`)
        .setColor("#b9375e");

    const rollButton = new ButtonBuilder()
        .setCustomId('roll_button')
        .setLabel('Confirm')
        .setStyle('Success');

    const row = new ActionRowBuilder().addComponents(rollButton);

    const eventRollMessage = await msg.channel.send({ embeds: [eventRollEmbed], components: [row] });

    const filter = (interaction) => interaction.customId === 'roll_button' && interaction.user.id === userId;
    const collector = eventRollMessage.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async (interaction) => {
        await interaction.deferUpdate();
        await eventRoll(userId, eventRollMessage);
        collector.stop();
    });

    collector.on('end', (collected) => {
        if (!collected.size) {
            eventRollMessage.edit({ components: [] });
        }
    });
}

module.exports = { eventRoll, initiateEventRoll };
