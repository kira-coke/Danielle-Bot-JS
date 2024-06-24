const { EmbedBuilder } = require("discord.js");
const Discord = require("discord.js");
const {getUser} = require("./users.js");
const {getRandomDynamoDBItem,writeToDynamoDB,getHowManyCopiesOwned,checkIfUserOwnsCard,addToTotalCardCount,checkTotalCardCount,getUserCard} = require("./cards");
const {getUsersBalance,saveUserBalance} = require("./userBalanceCmds");

function getDaily(msg,userId){
  // get a random card from the storage and store the details to be able to be used in bellow embeded message
    (async () => {
        try {
            const tableName = "cards";
            const randomCard = await getRandomDynamoDBItem(tableName);
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
                        "user-id": userId, //primary key
                        "card-id": randomCard["card-id"], //secondary key
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
                        `You have recieved the following card: \n**${Discord.inlineCode(randomCard["card-id"])} ${randomCard["GroupName"]} ${randomCard["GroupMember"]}** (${randomCard["Theme"]})`,
                    )
                    .addFields(
                        {
                            name:`Copies now Owned: ${Discord.inlineCode(
                                    String(numberOfCopies + 1))}`,
                            value: " ",
                            inline: false,
                        }, 
                        {
                            name: `You have recieved:  ${Discord.inlineCode(randomAmountWithCommas)}`,
                            value: " ",
                            inline: false,
                        },
                        {
                            name: `Your new balance is: ${Discord.inlineCode(newBalanceWithCommas)}`,
                            value: " ",
                            inline: false,
                        }
                    )
                    .setImage(randomCard["cardUrl"]) // changed depending on the card recieved
                    .setFooter({
                        text: msg.author.tag,
                        iconURL: msg.author.displayAvatarURL({
                            dynamic: true,
                        }),
                    })
                    .setTimestamp();
                msg.reply({ embeds: [embed] });
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