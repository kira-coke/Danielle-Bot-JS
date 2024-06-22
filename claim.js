const { EmbedBuilder } = require("discord.js");
const Discord = require("discord.js");
const {getRandomDynamoDBItem,writeToDynamoDB,getHowManyCopiesOwned,checkIfUserOwnsCard,addToTotalCardCount,checkTotalCardCount} = require("./cards");

function getClaim(msg,userId){
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
                    .catch((error) => {
                        console.error("Error:", error);
                    });

                const embed = new EmbedBuilder()
                    .setColor("#ffd5b3")
                    .setTitle("**You have dropped**")
                    .setDescription(
                        `**${Discord.inlineCode(randomCard["card-id"])} ${randomCard["GroupName"]} ${randomCard["GroupMember"]}** (${randomCard["Theme"]})`,
                    )
                    .addFields(
                        {
                            name: `Copies now Owned: ${Discord.inlineCode(
                                String(numberOfCopies + 1))}`,
                            value: " ",
                            inline: true,
                        }, // You can set inline to true if you want the field to display inline.
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

module.exports = {getClaim};