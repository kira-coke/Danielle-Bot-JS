require("dotenv").config();
const prefix = '.';
const Discord = require("discord.js");
const AWS = require('aws-sdk');
AWS.config.update({
    accessKeyId: process.env['Access_key'],
    secretAccessKey: process.env['Secret_access_key'],
    region: 'eu-west-2'
});
const dynamodb = new AWS.DynamoDB.DocumentClient();
const {isCooldownExpired, setUserCooldown, getUserCooldown} = require('./cooldowns');
const {getRandomDynamoDBItem, writeToDynamoDB, getHowManyCopiesOwned, getCardFromTable, getTotalCards, changeNumberOwned, checkIfUserOwnsCard} = require('./cards');
const {getUsersBalance, saveUserBalance} = require('./userBalanceCmds');
const {GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events} = require('discord.js');
const client = new Discord.Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});
const { EmbedBuilder } = require("discord.js");

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on("messageCreate", async (msg) => {
    if (msg.content.startsWith(prefix)){
        const args = msg.content.slice(prefix.length).trim().split(' ');
        const command = args.shift().toLowerCase();
        const userId = msg.author.id;
        const authorTag = `${msg.author.username}#${msg.author.discriminator}`;
        const userExists = await checkUserExists(userId);
        const claimCd = 1; 
        const dropCd = 5;
        if (msg.author.bot) return;

        //check for if theyre blacklisted
        if(userExists){
            const userDisabled = await checkUserDisabled(userId);
            if(!userDisabled){//returns false if they are no longer allowed to play (not enabled)
                msg.reply('**You have been blacklisted from the game**');
                return;
            }
        }

        //check if theyre not registered, then let them start, if they are inform them they are registered
        if(!userExists){
            if (command === "start") {
                const embed = new EmbedBuilder()
                    .setColor(0x0099ff)
                    .setTitle("**Welcome to Danielle Bot **" + authorTag + "**!**")
                    .setDescription(
                        "**Enjoy your stay <:daniheart:1251995500308336723> You have been given 10,000 coins as a welcome gift!**",
                    )// add an amount of currency here and add it to the users balance after they start
                    .setImage(
                        "https://media.discordapp.net/attachments/863906210582626335/1252011345168175225/newjeans-danielle-omg-4k-wallpaper-uhdpaper.com-2350i.jpg?ex=6670a9ed&is=666f586d&hm=985b63d3eb9d63aa6a86c8479f85e6a1d8aa61d47e5329d011978f35ab3e67a1&=&format=webp&width=1177&height=662",
                    )
                    .setTimestamp();
                msg.reply({ embeds: [embed] });
                await saveUserData(userId);
            }
            else{
                const noUserdata = new EmbedBuilder()
                    .setColor('#EE4B2B')
                    .setDescription(`Ensure you have done the .start command. If you feel this is an error feel free to inform me @kira.c`)
                    .setTimestamp();
                msg.channel.send({ embeds: [noUserdata] });
                return;  
            }
        } else{
            if(command === "start"){
                msg.channel.send(`**You are already registered!**`);
                return;
            }
        }

        if (command === "profile") {
            const embed = new EmbedBuilder()
                .setColor(0x0099ff) //should be able to change colour
                .setTitle(authorTag)
                .setDescription("\u200B\n**Kira's temp profile**\n") //make this communicate with database so users can change desc
                .setFooter({
                    text: msg.author.tag,
                    iconURL: msg.author.displayAvatarURL({ dynamic: true })
                })
                .setImage(
                    "https://danielle-bot-images.s3.eu-west-2.amazonaws.com/NJ_DN_HB.png",
                ) //they should be able to change this - change card etc
                .setTimestamp();
            msg.reply({ embeds: [embed] });
        }
        
        if (command === "claim") {
            if (isCooldownExpired(userId, command, claimCd)) {
                setUserCooldown(userId, command);
            } else {
                const remainingTime = getUserCooldown(userId, command, claimCd);
                msg.reply(`**Remaining cooldown: ${remainingTime} seconds**`);
                return;
            }
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
                        const cardExistsFoUser = await checkIfUserOwnsCard(
                            secondTableName,
                            userId,
                            randomCard["card-id"],
                        )
                        if(cardExistsFoUser===0){
                            item = {
                                "user-id": userId, //primary key
                                "card-id": randomCard["card-id"], //secondary key
                                "exp": 0,
                                "level": 0,
                                "upgradable": false,
                                "copies-owned": 1,
                            };
                        }else{
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
                                "exp": 0,
                                "level": 0,
                                "upgradable": false,
                                "copies-owned": (numberOfCopies+1),
                            };
                        }
                        writeToDynamoDB(secondTableName, item)
                            .then(() => {
                                console.log(
                                    "Successfully wrote item to DynamoDB first table",
                                );
                            })
                            .catch((error) => {
                                console.error("Error:", error);
                            });

                        const embed = new EmbedBuilder()
                            .setColor(0x0099ff)
                            .setTitle("\n\u200B\n**Claim Recieved!**\n")
                            .setDescription(
                                `You have dropped **${randomCard["GroupName"]} ${randomCard["GroupMember"]}**`,
                            )
                            .addFields(
                                {
                                    name: "Copies now Owned",
                                    value: Discord.inlineCode(
                                        String(numberOfCopies + 1),
                                    ),
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

        if (command === "drop") {
            // get a 3 random cards from the storage and store the details to be able to be used in bellow embeded message
            // register which button the user clicked and then which image (card) corresponds
            // add card to their inv in database
            if (isCooldownExpired(userId, command, dropCd)) {
                setUserCooldown(userId, command);
            } else {
                const remainingTime = getUserCooldown(userId, command, dropCd);
                msg.reply(`**Remaining cooldown: ${remainingTime} seconds**`);
                return;
            }
            (async () => {
                try {
                    const tableName = "cards";
                    const randomCardOne =
                        await getRandomDynamoDBItem(tableName);
                    const randomCardTwo =
                        await getRandomDynamoDBItem(tableName);
                    const randomCardThree =
                        await getRandomDynamoDBItem(tableName);

                    const embed = new EmbedBuilder()
                        .setColor(0x0099ff)
                        .setTitle("**Drop recieved**")
                        /*.setDescription(
                            "\n\u200B\n**Click an option bellow to claim a card**\n\u200B\n",
                        )*/
                        .setFooter({
                            text: msg.author.tag,
                            iconURL: msg.author.displayAvatarURL({
                                dynamic: true,
                            }),
                        })
                        .setTimestamp();

                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId("button1")
                            .setLabel(
                                String(randomCardOne["GroupMember"]) +
                                    " (" +
                                    String(randomCardOne["Theme"]) +
                                    ")",
                            )
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId("button2")
                            .setLabel(
                                String(randomCardTwo["GroupMember"]) +
                                    " (" +
                                    String(randomCardTwo["Theme"]) +
                                    ")",
                            )
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId("button3")
                            .setLabel(
                                String(randomCardThree["GroupMember"]) +
                                    " (" +
                                    String(randomCardThree["Theme"]) +
                                    ")",
                            )
                            .setStyle(ButtonStyle.Secondary),
                    );

                    client.on(Events.InteractionCreate, async (interaction) => {
                        if (interaction.user.id !== msg.author.id) {
                            //can only interact with your own command
                            //await interaction.reply({ content: 'This is not your command', ephemeral: true });
                            return;
                        }
                        //add something to have it so you can only click one button and only once

                        if (!interaction.isButton()) return;

                        await interaction.deferUpdate();
                        let response;
                        const thirdTableName = "bot-data";
                        const newCardID = await getNewCardId(thirdTableName);

                        switch (interaction.customId) {
                            case "button1":
                                response =
                                    "You have claimed: " +
                                    String(randomCardOne["GroupMember"]) +
                                    " (" +
                                    String(randomCardOne["Theme"]) +
                                    ")";
                                const card1 = {
                                    "user-id": userId, //primary key
                                    "secondary-card-id": newCardID, //secondary key
                                    "card-id": randomCardOne["card-id"], //id for which base card it is
                                    exp: 0,
                                    level: 0,
                                    upgradable: false,
                                    "copies-owned": numberOfCopies,
                                };
                                writeToDynamoDB("user-cards", card1);
                                const item1 = {
                                    botName: "Danielle Bot",
                                    nextCardID: Number(newCardID),
                                };
                                writeToDynamoDB(thirdTableName, item1);
                                break;
                            case "button2":
                                response =
                                    "You have claimed: " +
                                    String(randomCardOne["GroupMember"]) +
                                    " (" +
                                    String(randomCardOne["Theme"]) +
                                    ")";
                                response =
                                    "You have claimed: " +
                                    String(randomCardOne["GroupMember"]) +
                                    " (" +
                                    String(randomCardOne["Theme"]) +
                                    ")";
                                const card2 = {
                                    "user-id": userId, //primary key
                                    "secondary-card-id": newCardID, //secondary key
                                    "card-id": randomCardOne["card-id"], //id for which base card it is
                                    upgradable: false,
                                };
                                writeToDynamoDB("user-cards", card2);
                                const item2 = {
                                    botName: "Danielle Bot",
                                    nextCardID: Number(newCardID),
                                };
                                writeToDynamoDB(thirdTableName, item2);
                                break;
                            case "button3":
                                response =
                                    "You have claimed: " +
                                    String(randomCardOne["GroupMember"]) +
                                    " (" +
                                    String(randomCardOne["Theme"]) +
                                    ")";
                                response =
                                    "You have claimed: " +
                                    String(randomCardOne["GroupMember"]) +
                                    " (" +
                                    String(randomCardOne["Theme"]) +
                                    ")";
                                const card3 = {
                                    "user-id": userId, //primary key
                                    "secondary-card-id": newCardID, //secondary key
                                    "card-id": randomCardOne["card-id"], //id for which base card it is
                                    upgradable: false,
                                };
                                writeToDynamoDB("user-cards", card3);
                                const item3 = {
                                    botName: "Danielle Bot",
                                    nextCardID: Number(newCardID),
                                };
                                writeToDynamoDB(thirdTableName, item3);
                                break;
                        }
                        await interaction.followUp({
                            content: response,
                            ephemeral: true,
                        });
                    });
                    msg.reply({ embeds: [embed], components: [row] });
                } catch (error) {
                    console.error("Error:", error);
                }
            })();
        }

        if(command === "bal"){
            const userBal = await getUsersBalance(userId);
            if (userBal === null) {
                const noBalanceEmbed = new EmbedBuilder()
                    .setColor('#ED4245')
                    .setTitle(`${msg.author.username}'s Balance`)
                    .setDescription(`No balance found for this user. Ensure you have done the .start command. If you feel this is an error feel free to inform me @kira.c`)
                    .setTimestamp();
                msg.channel.send({ embeds: [noBalanceEmbed] });
                return;
            }
            function numberWithCommas(x) {
                return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            }
            const balWithCommas = numberWithCommas(userBal);

            const balanceEmbed = new EmbedBuilder()
                .setColor('#23272A')
                .setTitle(`${msg.author.username}'s Balance`)
                .setDescription("**Balance: **" + Discord.inlineCode(`${balWithCommas}`))
                .setTimestamp();
            msg.channel.send({ embeds: [balanceEmbed] });
            
        }

        if(command === "pay"){
            const amount = parseFloat(args[1]);
            if((amount < 0) | !(Number.isInteger(amount))){
                msg.channel.send('**Ensure you have entered a valid amount to pay**');
                return;
            }
            let targetUser = msg.mentions.users.first();
            if(targetUser === msg.author){
                msg.channel.send('** Trying to give yourself money? **');
                return;
            }
            if(targetUser === undefined){
                msg.channel.send('Please mention a user.');
                return;
            }
            if (isNaN(amount)) {
                msg.channel.send('Please provide a valid amount!');
                return;
            }
            const userExists = await checkUserExists(targetUser.id);
            if (!userExists) {
                msg.channel.send(`**This user is not registered yet, please tell them to do .start**`);
                return;
            }else{
                const targetUserId = targetUser.id;

                // Load balances for both users
                const userBalance = await getUsersBalance(userId);
                const targetUserBalance = await getUsersBalance(targetUserId);
                
                if (userBalance === null) {
                msg.channel.send('No balance found for you.');
                return;
                }

                if (userBalance < amount) {
                msg.channel.send('Insufficient funds.');
                return;
                }

                // Update balances
                await saveUserBalance(userId, userBalance - amount);
                await saveUserBalance(targetUserId, (targetUserBalance || 0) + amount);

                const transactionEmbed = new EmbedBuilder()
                    .setColor('#0099ff') 
                    .setTitle('Currency Transaction')
                    .setDescription(`**You have paid ${amount} to ${targetUser.username}**`)
                    .setTimestamp(); 

                msg.channel.send({ embeds: [transactionEmbed] });
            }
                
        }

        if(command === "cd"){
            //write cooldown embed
        }

        if(command === "index"){ //TOTO modify it so it only shows like 10 per pages or something 
            const listOfCards = await (getTotalCards('cards'));
            listOfCards.Items.forEach(element => {
                console.log(element.GroupMember);
                console.log(element.GroupName);
            })

            const embed = new EmbedBuilder()
                .setTitle(`Displaying all the current cards in circulation`)
                .setColor(0x00AE86)
                .setFooter({
                    text: msg.author.tag,
                    iconURL: msg.author.displayAvatarURL({
                        dynamic: true,
                    }),
                })
            listOfCards.Items.forEach(attribute => {
                embed.addFields(
                    { name: 'Group Name', value: attribute.GroupName, inline: true },
                    { name: 'Member Name', value: attribute.GroupMember, inline: true },
                    { name: 'Card ID', value: attribute["card-id"], inline: true},
                );
            });
            msg.channel.send({ embeds: [embed] });
            //scan the cards table and return every item
            //list these items in an embed
        }

        if(command === "view"){
            //get second parameter entered by the user and parse that as the cardid to get from table
            const cardId = args[0];
            if(cardId === undefined){
                msg.reply("**Please input a card id**");
                return;
            }+
            (async () => {
                    try {
                        const tableName = 'cards';
                        // Call the function and store the returned URL in a const
                        const cardToView = await getCardFromTable(tableName, cardId);
                        const secondTableName = "user-cards";
                        const attributeName = cardToView["card-id"];
                        const numberOfCopies = await getHowManyCopiesOwned(
                            secondTableName,
                            userId,
                            attributeName,
                        );
                        //get current exp and level
                        const embed = new EmbedBuilder() //embed that shows the group name, member name, card id and card url
                            .setColor(0x0099ff)
                            .setDescription(`You are viewing **${cardToView['GroupName']} ${cardToView['GroupMember']}**`)
                            .setImage(
                                cardToView['cardUrl'],
                            ) // changed depending on the card recieved
                            .addFields(
                                {
                                    name: "You Own: ",
                                    value: Discord.inlineCode(String(numberOfCopies)),
                                    inline: true,
                                },
                            )
                            .setFooter({
                                text: msg.author.tag,
                                iconURL: msg.author.displayAvatarURL({ dynamic: true })
                            })
                            .setTimestamp();
                        msg.reply({ embeds: [embed] });

                    } catch (error) {
                        msg.reply("**Please enter a valid card id**");
                        console.log("Could not find card in table with card-id " + cardId);
                        console.error('Error:', error);
                    }
                    }    
            )();
            
        }

        if(command === "gift"){
            const cardIDToGift = args[1];
            const numberOfCopiesToGive = parseFloat(args[2]); //ideally should be !gift @user xyz 3
            if(msg.mentions.users.first() == undefined){
                msg.channel.send('Please mention a user.');
                return;
            }
            let targetUser = msg.mentions.users.first();
            if(targetUser.id === "1251915536065892413"){
                msg.channel.send('** Trying to gift the georgeos danielle? **');
                return;
            }

            if(targetUser === msg.author){
                msg.channel.send('** Trying to gift yourself? **');
                return;
            }
            if (isNaN(numberOfCopiesToGive)) {
                msg.channel.send('Please ensure you have given a card id and amount to gift'); //theyve tried to give an invalid amount
                return;
            }
            if(numberOfCopiesToGive == 0){
                msg.channel.send('Please give a non zero amount to gift'); //theyve tried to give an invalid amount
                return;
            }
            const userExists = await checkUserExists(targetUser.id);
            (async () => {
                const targetUserId = targetUser.id;
                const tableName = 'cards';
                try{
                    await getCardFromTable(tableName, cardIDToGift); 
                }catch(error){
                    console.log('Couldnt find item with this card:' + cardIDToGift);
                    msg.channel.send('**Please enter a valid card id**');
                    return;
                }
                if(!userExists){
                    msg.channel.send(`**This user is not registered yet, please tell them to do .start**`);
                    return;
                }
                try{
                    const secondTableName = "user-cards";
                    const numberOfCopies = await getHowManyCopiesOwned(
                        secondTableName,
                        userId,
                        cardIDToGift,
                    );
                    if((numberOfCopies == 0) || numberOfCopies < numberOfCopiesToGive){
                        msg.channel.send('**You do not own enough copies of this card to gift**');
                        return;
                    }else{
                        try {
                            const currentOwnedByUser1 = await getHowManyCopiesOwned(secondTableName, userId, cardIDToGift);
                            const currentOwnedByUser2 = await getHowManyCopiesOwned(secondTableName, targetUserId, cardIDToGift);
                            if(currentOwnedByUser1===1){
                                msg.reply("**You must own more than 1 copy to gift duplicates**");
                                return;
                            }
                            if(currentOwnedByUser2===0){
                                msg.reply("**The user must own at least one copy to be gifted**");
                                return;
                            }
                            await changeNumberOwned(secondTableName, userId, cardIDToGift, parseInt(currentOwnedByUser1)-numberOfCopiesToGive);
                            await changeNumberOwned(secondTableName, targetUserId, cardIDToGift, parseInt(currentOwnedByUser2)+numberOfCopiesToGive);
                            //call the changeNumberOwned function here twiocer, once for msg user once for target user
                            //embed informing uve given x amount to targetUser
                        }catch(error){
                            console.log('Failed to gift the cards');
                            console.log('Error:' + error);
                        }
                    }
                }catch(error){
                    console.log("Couldn't find item in table user-cards with this card id: " + cardIDToGift);
                }
                }    
            )();
        }
    }

    //function for the inital adding of a user to the database only
    async function saveUserData(userId) {
        const params = {
            TableName: 'Dani-bot-playerbase',
            Item: {
                'user-id': userId,
                'Balance': 10000,
                'Enabled': true,
                'JoinDate': msg.createdAt.toString()
            }
        };

        try {
            await dynamodb.put(params).promise();
        } catch (err) {
            console.error('Unable to save data:', err);
        }
    } 

    async function checkUserExists(userId) {
        const params = {
            TableName: 'Dani-bot-playerbase',
            Key: {
                'user-id': userId
            }
        };

        try {
            const data = await dynamodb.get(params).promise();
            return !!data.Item;
        } catch (err) {
            console.error('Unable to check if user exists:', err);
            return false;
        }
    }

    async function checkUserDisabled(userId){
        const params = {
            TableName: 'Dani-bot-playerbase',
            Key: {
                'user-id': userId
            }
        };
        try {
            const data = await dynamodb.get(params).promise();
            return !!data.Item.Enabled;;
        } catch (err) {
            console.error('Unable to check if user exists:', err);
            return false;
        }
    }


});

client.login(process.env.Token);

