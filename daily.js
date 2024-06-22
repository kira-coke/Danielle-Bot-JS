const { EmbedBuilder } = require("discord.js");
const Discord = require("discord.js");
const {getRandomDynamoDBItem,writeToDynamoDB,getHowManyCopiesOwned,checkIfUserOwnsCard,addToTotalCardCount,checkTotalCardCount} = require("./cards");
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
                    };
                } else {
                    //msg.channel.send("You do own card, will write code to incremenet value");
                    numberOfCopies = await getHowManyCopiesOwned(
                        secondTableName,
                        userId,
                        randomCard["card-id"],
                        attributeName,
                    );
                    item = {
                        "user-id": userId, //primary key
                        "card-id": randomCard["card-id"], //secondary key
                        exp: 0,
                        level: 0,
                        upgradable: false,
                        "copies-owned": numberOfCopies + 1,
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
                    .then(() => {
                        console.log(
                            "Successfully wrote item to DynamoDB first table",
                        );
                    })
                    .catch((error) => {
                        console.error("Error:", error);
                    });
                const randomAmount = await getRandomAmount();
                const randomAmountWithCommas = numberWithCommas(randomAmount);
                const userBalance = await getUsersBalance(userId);
                const newBalance = parseInt(userBalance) + randomAmount;
                const newBalanceWithCommas = numberWithCommas(newBalance);
                await saveUserBalance(userId, newBalance);

                const embed = new EmbedBuilder()
                    .setColor("#ffd5b3")
                    .setTitle("You are on an //TODO daily streak!")
                    .setDescription(
                        `You have recieved the following card: **${randomCard["GroupName"]} ${randomCard["GroupMember"]}**`,
                    )
                    .addFields(
                        {
                            name: "Copies now Owned",
                            value: Discord.inlineCode(
                                String(numberOfCopies + 1),
                            ),
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

async function getRandomAmount(){
     const randomNumber = Math.floor(Math.random() * (5000 - 2500 + 1)) + 2500;
     return randomNumber;
}

function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

module.exports = {getDaily};