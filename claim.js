const { EmbedBuilder } = require("discord.js");
const Discord = require("discord.js");
const {getUser} = require("./users.js");
const {getRandomDynamoDBItem,writeToDynamoDB,getHowManyCopiesOwned,checkIfUserOwnsCard,addToTotalCardCount,checkTotalCardCount, getUserCard, getTotalCards} = require("./cards");

async function getClaim(msg,userId){
    const user= await getUser(userId);
    const userFavCard = user["FavCard"];
    const userFavCardData = await getUserCard("user-cards",userId,userFavCard);
    const cardData = userFavCardData[0];
    let cardWeights = {};
    if(cardData.tier === 2){
        cardWeights = {
            [userFavCard]: 2, 
        };
    }
    if(cardData.tier === 3){
        cardWeights = {
            [userFavCard]: 3, 
        };
    }
    async function getWeightedRandomCard(tableName) {
        const allCards = await getTotalCards(tableName); // Function to get all cards from the table
        if (!Array.isArray(allCards.Items)) {
            console.error("Expected an array but received:", allCards);
            throw new TypeError("Expected an array of cards");
        }
        const weightedList = [];

        allCards.Items.forEach(card => {
            const weight = cardWeights[[card["card-id"]]] || 1; ; // Default weight is 1 if not specified
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
            if(cardData.tier >=2){
                try{
                    randomCard = await getWeightedRandomCard(tableName);
                }catch(error){
                    console.log("Issue getting weighted random card");
                    console.log(error);
                }
            }else{
                randomCard = await getRandomDynamoDBItem(tableName);
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