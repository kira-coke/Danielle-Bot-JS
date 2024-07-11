const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, inlineCode} = require("discord.js");
const Discord = require("discord.js");
const {getRandomDynamoDBItem, writeToDynamoDB,getHowManyCopiesOwned,checkIfUserOwnsCard,addToTotalCardCount,checkTotalCardCount,getUserCard, getWeightedCard, getCardFromTable} = require("./cards");
const {getUser} = require("./users.js")

async function getDrop(msg,userId){
    const user = await getUser(userId);
    const userFavCard = user["FavCard"];
    const userFavCardData = await getUserCard("user-cards",userId,userFavCard);
    const cardData = userFavCardData[0];
    const cardFromCards = await getCardFromTable("cards", userFavCard);
    (async () => {
        try {
            const tableName = "cards";
            let randomCards = [];
            const numCards = 3;

            for (let i = 0; i < numCards; i++) {
                let randomCard = "";
                if (cardData === undefined) {
                    randomCard = await getRandomDynamoDBItem(tableName);
                } else {
                    if (cardData.tier >= 2) {
                        try {
                            if (cardFromCards.cardRarity === 1) {
                                randomCard = await getWeightedCard(userId);
                                console.log("Got weighted card");
                            } else {
                                randomCard = await getRandomDynamoDBItem(tableName);
                            }
                        } catch (error) {
                            console.log("Issue getting weighted random card");
                            console.log(error);
                            randomCard = await getRandomDynamoDBItem(tableName); // Fallback to random card
                        }
                    } else {
                        randomCard = await getRandomDynamoDBItem(tableName);
                    }
                }
                randomCards.push(randomCard);
            }

            const embed = new EmbedBuilder()
                .setTitle("Drop Recieved")
                //.setDescription("Pick a card to claim")
                .setColor("#cdb4db");
            randomCards.forEach((card, index) => {
                embed.addFields({name: `${randomCards[index]["card-id"]}`, value: `**Group:** ${randomCards[index]["GroupName"]}\n**Member:** ${randomCards[index]["GroupMember"]}\n**Theme:** ${randomCards[index]["Theme"]}`, inline: true});
            });

            const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('card1')
                    .setLabel(randomCards[0]["GroupMember"])
                    .setStyle('Secondary'),
                new ButtonBuilder()
                    .setCustomId('card2')
                    .setLabel(randomCards[1]["GroupMember"])
                    .setStyle('Secondary'),
                new ButtonBuilder()
                    .setCustomId('card3')
                    .setLabel(randomCards[2]["GroupMember"])
                    .setStyle('Secondary')
            );

            const sentMessage = await msg.channel.send({ embeds: [embed], components: [row] });
            const filter = i => i.user.id === userId;
            const collector = sentMessage.createMessageComponentCollector({ filter, max: 1, time: 60000 });
            let card = "";
            collector.on('collect', async interaction => {
                if (!interaction.isButton()) return;

                const cardIndex = parseInt(interaction.customId.replace('card', ''), 10) - 1;
                card = randomCards[cardIndex];

                const disabledRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('card1')
                            .setLabel(randomCards[0]["GroupMember"])
                            .setStyle('Secondary')
                            .setDisabled(true),
                        new ButtonBuilder()
                            .setCustomId('card2')
                            .setLabel(randomCards[1]["GroupMember"])
                            .setStyle('Secondary')
                            .setDisabled(true),
                        new ButtonBuilder()
                            .setCustomId('card3')
                            .setLabel(randomCards[2]["GroupMember"])
                            .setStyle('Secondary')
                            .setDisabled(true)
                    );

                await interaction.update({ components: [disabledRow] });
                
                //await interaction.followUp(`**You have claimed: ** ${card["GroupName"]} ${card["GroupMember"]} ${card["Theme"]}`);
            });

            collector.on('end', async collected => {
                if(collected.size === 0){
                    const disabledRow = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('card1')
                                .setLabel(randomCards[0]["GroupMember"])
                                .setStyle('Secondary')
                                .setDisabled(true),
                            new ButtonBuilder()
                                .setCustomId('card2')
                                .setLabel(randomCards[1]["GroupMember"])
                                .setStyle('Secondary')
                                .setDisabled(true),
                            new ButtonBuilder()
                                .setCustomId('card3')
                                .setLabel(randomCards[2]["GroupMember"])
                                .setStyle('Secondary')
                                .setDisabled(true)
                        );
                    const embed = new EmbedBuilder()
                        .setTitle("Drop Timed Out")
                        //.setDescription("Pick a card to claim")
                        .setColor("#cdb4db");
                    randomCards.forEach((card, index) => {
                        embed.addFields({name: `${randomCards[index]["card-id"]}`, value: `**Group:** ${randomCards[index]["GroupName"]}\n**Member:** ${randomCards[index]["GroupMember"]}\n**Theme:** ${randomCards[index]["Theme"]}`, inline: true});
                    });
                    await sentMessage.edit({ embeds: [embed],components: [disabledRow] });
                    console.log(`Collector ended without any interactions.`);
                    return;
                }
                let item = {};
                let numberOfCopies = 0;
                const cardExistsForUser = await checkIfUserOwnsCard("user-cards",userId,card["card-id"]);
                const userCard = await getUserCard("user-cards", userId, card["card-id"]);
                const userCardData = userCard[0];
                if (cardExistsForUser === 0) {
                    item = {
                        "user-id": userId, //primary key
                        "card-id": card["card-id"], //secondary key
                        exp: 0,
                        level: 0,
                        upgradable: false,
                        "copies-owned": 1,
                        tier: 1,
                        totalExp: 0
                    };
                }else{
                    numberOfCopies = await getHowManyCopiesOwned(
                        "user-cards",
                        userId,
                        card["card-id"],
                        "copies-owned",
                    );
                    item = {
                        "user-id": userId, //primary key
                        "card-id": card["card-id"], //secondary key
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
                writeToDynamoDB("user-cards", item)
                    .catch((error) => {
                        console.error("Error:", error);
                    });
                console.log(`Collected ${collected.size} interactions.`);

                const embed = new EmbedBuilder()
                    .setColor("#ffd5b3")
                    .setTitle("**You have dropped**")
                    .setDescription(
                        `**${Discord.inlineCode(card["card-id"])} ${card["GroupName"]} ${card["GroupMember"]}** (${card["Theme"]})`,
                    )
                    .addFields(
                        {
                            name: `Copies now Owned: ${Discord.inlineCode(
                                String(numberOfCopies + 1))}`,
                            value: " ",
                            inline: true,
                        }, // You can set inline to true if you want the field to display inline.
                    )
                    .setImage(card["cardUrl"]) // changed depending on the card recieved
                    .setFooter({
                        text: msg.author.tag,
                        iconURL: msg.author.displayAvatarURL({
                            dynamic: true,
                        }),
                    })
                    .setTimestamp();
                msg.reply({ embeds: [embed] });
            });

        } catch (error) {
            console.error("Error:", error);
        }
    })();
}

module.exports = {getDrop};