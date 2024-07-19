const { EmbedBuilder } = require("discord.js");
const Discord = require("discord.js");
const {getUser} = require("./users.js");
const {getRandomDynamoDBItem,writeToDynamoDB,getHowManyCopiesOwned,checkIfUserOwnsCard,addToTotalCardCount,checkTotalCardCount,getUserCard, getTotalCards, storeDiscordCachedUrl} = require("./cards");
const {getUsersBalance,saveUserBalance} = require("./userBalanceCmds");
const emote = '<:DB_currency:1257694003638571048>'; 
const path = require('path');
const fs = require('fs');

async function getDaily(msg, userId) {
    const user = await getUser(userId);
    const userFavCard = user["FavCard"];
    const userFavCardData = await getUserCard("user-cards", userId, userFavCard);
    const cardData = userFavCardData[0];
    let cardWeights = {};
    if (cardData !== undefined) {
        if (cardData.tier === 2) {
            cardWeights = {
                [userFavCard]: 2,
            };
        }
        if (cardData.tier >= 3) {
            cardWeights = {
                [userFavCard]: 3,
            };
        }
    }

    async function getWeightedRandomCard(tableName) {
        const allCards = await getTotalCards(tableName); // Function to get all cards from the table
        if (!Array.isArray(allCards.Items)) {
            console.error("Expected an array but received:", allCards);
            throw new TypeError("Expected an array of cards");
        }
        const weightedList = [];

        allCards.Items.forEach(card => {
            const weight = cardWeights[card["card-id"]] || 1; // Default weight is 1 if not specified
            for (let i = 0; i < weight; i++) {
                weightedList.push(card);
            }
        });
        const randomIndex = Math.floor(Math.random() * weightedList.length);
        return weightedList[randomIndex];
    }

    (async () => {
        try {
            const tableName = "cards";
            let randomCard = "";
            if (cardData === undefined) {
                randomCard = await getRandomDynamoDBItem(tableName);
            } else {
                if (cardData.tier >= 2) {
                    try {
                        randomCard = await getWeightedRandomCard(tableName);
                    } catch (error) {
                        console.log("Issue getting weighted random card");
                        console.log(error);
                    }
                } else {
                    randomCard = await getRandomDynamoDBItem(tableName);
                }
            }
            try {
                const secondTableName = "user-cards";
                const attributeName = randomCard["copies-owned"];
                let item = {};
                let numberOfCopies = 0;
                const cardExistsForUser = await checkIfUserOwnsCard(
                    secondTableName,
                    userId,
                    randomCard["card-id"],
                );
                if (cardExistsForUser === 0) {
                    item = {
                        "user-id": userId, // primary key
                        "card-id": randomCard["card-id"], // secondary key
                        exp: 0,
                        level: 0,
                        upgradable: false,
                        "copies-owned": 1,
                        tier: 1,
                        totalExp: 0,
                    };
                } else {
                    numberOfCopies = await getHowManyCopiesOwned(
                        secondTableName,
                        userId,
                        randomCard["card-id"],
                        attributeName,
                    );
                    const userCard = await getUserCard(secondTableName, userId, randomCard["card-id"]);
                    const userCardData = userCard[0];
                    item = {
                        "user-id": userId, // primary key
                        "card-id": randomCard["card-id"], // secondary key
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
                let currencyMultiplier = 1;

                // Check and update daily streak
                const user = await getUser(userId);
                let streakMessage = `You are on a ${user["DailyStreak"]} daily streak!`;

                // Apply streak bonus every 7 days
                if (user["DailyStreak"] % 7 === 0) {
                    currencyMultiplier = 2;
                    streakMessage += "\n**Daily streak bonus: Currency doubled!**";
                }
                const randomAmount = Math.floor(getRandomAmount() * currencyMultiplier);
                const randomAmountWithCommas = numberWithCommas(randomAmount);
                const userBalance = await getUsersBalance(userId);
                const newBalance = parseInt(userBalance) + randomAmount;
                const newBalanceWithCommas = numberWithCommas(newBalance);
                await saveUserBalance(userId, newBalance);

                const embed = new EmbedBuilder()
                    .setColor("#ffd5b3")
                    .setTitle(streakMessage)
                    .setDescription(
                        `You have received the following card: \n**${Discord.inlineCode(randomCard["card-id"])} ${randomCard["GroupName"]} ${randomCard["GroupMember"]}** (${randomCard["Theme"]})`,
                    )
                    .addFields(
                        {
                            name: `Copies now Owned: ${Discord.inlineCode(
                                String(numberOfCopies + 1))}`,
                            value: " ",
                            inline: false,
                        },
                        {
                            name: `You have received:  ${Discord.inlineCode(randomAmountWithCommas)}${emote} `,
                            value: " ",
                            inline: false,
                        },
                        {
                            name: `Your new balance is: ${Discord.inlineCode(newBalanceWithCommas)}${emote}`,
                            value: " ",
                            inline: false,
                        }
                    );

                // Fetch the image URL from the DynamoDB table
                const imageUrl = randomCard["cardUrl"];
                if (imageUrl) {
                    // Ensure the temp directory exists
                    const tempDir = path.join(__dirname, 'temp');
                    if (!fs.existsSync(tempDir)) {
                        fs.mkdirSync(tempDir);
                    }

                    // Download the image to a temporary file
                    const tempImagePath = path.join(tempDir, `${randomCard["card-id"]}.jpg`);
                    await downloadImage(imageUrl, tempImagePath);

                    // Attach the downloaded image
                    const file = new AttachmentBuilder(tempImagePath, { name: 'card-image.jpg' });
                    embed.setImage('attachment://card-image.jpg');

                    embed.setFooter({
                        text: msg.author.tag,
                        iconURL: msg.author.displayAvatarURL({ dynamic: true })
                    }).setTimestamp();

                    const sentMessage = await msg.reply({ embeds: [embed], files: [file] });
                    const discordCachedUrl = sentMessage.embeds[0].image.proxyURL;
                    await storeDiscordCachedUrl(randomCard["card-id"], discordCachedUrl);

                    // Clean up temporary file
                    fs.unlink(tempImagePath, err => {
                        if (err) {
                            console.error('Error deleting temporary file:', err);
                        }
                    });
                } else {
                    msg.reply("Image not found!");
                }
            } catch (error) {
                console.error("Error:", error);
            }
        } catch (error) {
            console.error("Error:", error);
        }
    })();
}

function getRandomAmount(){
     const randomNumber = Math.floor(Math.random() * (5000 - 2500 + 1)) + 2500;
     return randomNumber;
}

function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}


module.exports = {getDaily};