const { EmbedBuilder, AttachmentBuilder } = require("discord.js");
const Discord = require("discord.js");
const {getUser} = require("./users");
const {getRandomDynamoDBItem,writeToDynamoDB,getHowManyCopiesOwned,checkIfUserOwnsCard,addToTotalCardCount,checkTotalCardCount, getUserCard, getWeightedCard, getCardFromTable, storeDiscordCachedUrl, downloadImage} = require("./cards");
const fs = require('fs');
const path = require('path');

async function getClaim(msg, userId) {
    const user = await getUser(userId);
    const userFavCard = user["FavCard"];
    const userFavCardData = await getUserCard("user-cards", userId, userFavCard);
    const cardData = userFavCardData[0];
    const cardFromCards = await getCardFromTable("cards", userFavCard);

    (async () => {
        try {
            const tableName = "cards";
            let randomCard = "";
            if (cardData === undefined) {
                randomCard = await getRandomDynamoDBItem(tableName);
            } else {
                if (cardData.tier >= 2) {
                    try {
                        if (cardFromCards.cardRarity === 1) {
                            randomCard = await getWeightedCard(userId);
                            console.log(randomCard);
                        } else {
                            randomCard = await getRandomDynamoDBItem(tableName);
                        }
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
                    randomCard["card-id"]
                );
                const userCard = await getUserCard(secondTableName, userId, randomCard["card-id"]);
                const userCardData = userCard[0];
                if (cardExistsForUser === 0) {
                    item = {
                        "user-id": userId, // primary key
                        "card-id": randomCard["card-id"], // secondary key
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
                        attributeName
                    );
                    item = {
                        "user-id": userId, // primary key
                        "card-id": randomCard["card-id"], // secondary key
                        exp: userCardData.exp,
                        level: userCardData.level,
                        upgradable: false,
                        "copies-owned": numberOfCopies + 1,
                        tier: userCardData.tier,
                        totalExp: userCardData.totalExp
                    };
                }
                const cardCount = await checkTotalCardCount(
                    "Dani-bot-playerbase",
                    userId
                ).catch((error) => {
                    console.error("Error getting total card count:", error);
                });
                addToTotalCardCount(
                    "Dani-bot-playerbase",
                    userId,
                    parseInt(cardCount) + 1
                ).catch((error) => {
                    console.error("Error updating card count:", error);
                });
                writeToDynamoDB(secondTableName, item).catch((error) => {
                    console.error("Error:", error);
                });

                const embed = new EmbedBuilder()
                    .setColor("#ffd5b3")
                    .setTitle("**You have claimed**")
                    .setDescription(
                        `**${Discord.inlineCode(randomCard["card-id"])} ${randomCard["GroupName"]} ${randomCard["GroupMember"]}** (${randomCard["Theme"]})`
                    )
                    .addFields({
                        name: `Copies now Owned: ${Discord.inlineCode(String(numberOfCopies + 1))}`,
                        value: " ",
                        inline: true
                    });

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

module.exports = {getClaim};