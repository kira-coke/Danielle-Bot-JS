require("dotenv").config();
const prefix = ".";
const Discord = require("discord.js");
const AWS = require("aws-sdk");
const schedule = require('node-schedule');
AWS.config.update({
    accessKeyId: process.env["Access_key"],
    secretAccessKey: process.env["Secret_access_key"],
    region: "eu-west-2",
});
const{work} = require("./work");
const {forceRaffle} = require("./raffle");
const {getCooldowns} = require("./cooldowncommand.js");
const {giftcards} = require("./gift.js");
const {awardExp, upgrade} = require("./cardExpSystem.js");
const {saveUserBalance} = require("./userBalanceCmds.js");
const {saveUserData,checkUserExists,checkUserDisabled,setUserCard,setUserBio,setUserWishList,getUser,setAutoReminders, getUserCards} = require("./users.js");
const {saveUserCooldown,getUserCooldown} = require("./cooldowns");
const {getHowManyCopiesOwned,getCardFromTable,getTotalCards,changeNumberOwned, filterByAttribute, getUserCard, checkIfUserOwnsCard} = require("./cards");
const {getUserProfile} = require("./profile.js");
const {generateEmbedInvForGroup, generateRowInv, handleCollectorInv, getUniqueGroupNames, generateEmbedInv, handleCollectorInvForGroup } = require("./inventory.js");
const {generateEmbed, generateRow, handleCollector } = require("./indexCmd.js");
const {getUsersBalance} = require("./userBalanceCmds");
const {getClaim} = require("./claim.js");
const {getDrop} = require("./drop.js");
const {getDaily} = require("./daily.js");
const {GatewayIntentBits} = require("discord.js");
const {payCommand} = require("./pay.js");
const {setUserStreak} = require("./updateDailyStreak.js")
const { helpCommand, handleCollectorHelp, generateRowHelp } = require("./help.js");
const{enterDg, dgWinRates} = require("./dungeons.js");
const client = new Discord.Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers, //commend back in and our depending on which bot testing on
    ],
});
const { EmbedBuilder} = require("discord.js");

client.on("ready", () => {
    console.log(`Logged in as ${client.user.tag}!`);
    schedule.scheduleJob('*/20 * * * *', () => { //change to
        sendRaffleEmbed();
    });
});

client.on("messageCreate", async (msg) => {
    if (msg.content.startsWith(prefix)) {
        const args = msg.content.slice(prefix.length).trim().split(" ");
        const command = args.shift().toLowerCase();
        const userId = msg.author.id;
        const authorTag = `${msg.author.username}#${msg.author.discriminator}`;
        const userExists = await checkUserExists(userId);
        const generalCmdCd = Date.now() + 1 * 1000;
        const remainingCooldown = await getUserCooldown(userId, "generalCmdCd");

        if (remainingCooldown !== '0m 0s') {
            msg.reply(`You must wait ${remainingCooldown} before using a command again.`);
            return;
        }
        const cooldownTimestamp = generalCmdCd;
        await saveUserCooldown(userId, "generalCmdCd", cooldownTimestamp);
        
        if (msg.author.bot) return;

        //check for if theyre blacklisted
        if (userExists) {
            const userDisabled = await checkUserDisabled(userId);
            if (!userDisabled) {
                //returns false if they are no longer allowed to play (not enabled)
                msg.reply("**You have been blacklisted from the game**");
                return;
            }
        }
        //check if theyre not registered, then let them start, if they are inform them they are registered
        if (!userExists) {
            if (command === "start") {
                const embed = new EmbedBuilder()
                    .setColor("#f7cad0")
                    .setTitle(
                        "**Welcome to Danielle Bot **" + authorTag + "**!**",
                    )
                    .setDescription(
                        "**Enjoy your stay! You have been given 10,000 coins as a welcome gift!**",
                    ) // add an amount of currency here and add it to the users balance after they start
                    .setImage(
                        "https://danielle-bot-images.s3.eu-west-2.amazonaws.com/gifs/ezgif.com-gif-maker+(52).gif",
                    )
                    .setTimestamp();
                msg.reply({ embeds: [embed] });
                await saveUserData(userId, String(msg.createdAt));
            } else {
                const noUserdata = new EmbedBuilder()
                    .setColor("#EE4B2B")
                    .setDescription(
                        `Ensure you have done the .start command. If you feel this is an error feel free to inform me @kira.c`,
                    )
                    .setTimestamp();
                msg.channel.send({ embeds: [noUserdata] });
                return;
            }
        } else {
            if (command === "start") {
                msg.reply(`**You are already registered!**`);
                return;
            }
        }
        if (command === "profile" || command === "p") {
            let userId;
            if (msg.mentions.users.size > 0) {
                userId = msg.mentions.users.first().id;
            } else {
                userId = args.join(" ").trim();
            }
            if (!userId) {
                userId = msg.author.id;
            }
            try{
                await getUserProfile(msg, userId);
            }catch(error){
                msg.reply("Please input only the user id");
            }

        }

        if (command === "c" || command === "claim") {
            const command = "c";
            const claimCd = Date.now() + 300 * 1000; //change back to 300
            const remainingCooldown = await getUserCooldown(userId, command);

            if (remainingCooldown !== '0m 0s') {
                msg.reply(`You must wait ${remainingCooldown} before using this command again.`);
                return;
            }
            const cooldownTimestamp = claimCd;
            await saveUserCooldown(userId, command, cooldownTimestamp);
            const user = await getUser(userId);
            if(user.Reminders === true){
                setTimeout(() => {
                    msg.channel.send(`**Reminder:** <@${msg.author.id}> your claim is ready!`);
                }, 300 * 1000); // Convert minutes to milliseconds
            }
            getClaim(msg,userId);
        } 

        if (command === "d" || command === "drop") {
            const command = "d";
            const dropCd = Date.now() + 600 * 1000; //change to 600
            const remainingCooldown = await getUserCooldown(userId, command);

            if (remainingCooldown !== '0m 0s') {
                msg.reply(`You must wait ${remainingCooldown} before using this command again.`);
                return;
            }
            const cooldownTimestamp = dropCd;
            await saveUserCooldown(userId, command, cooldownTimestamp);
            const user = await getUser(userId);
            if(user.Reminders === true){
                setTimeout(() => {
                    msg.channel.send(`**Reminder:** <@${msg.author.id}> your drop is ready!`);
                }, 600 * 1000); // Convert minutes to milliseconds
            }
            getDrop(msg,userId);
        }

        if (command === "bal") {
            let targetUser;
            const mention = msg.mentions.users.first();

            if (mention) {
                targetUser = mention;
            } else {
                const args = msg.content.trim().split(/\s+/);
                const userId = args.length > 1 ? args[1] : null;

                if (userId) {
                    try {
                        targetUser = await msg.guild.members.fetch(userId);
                        targetUser = targetUser.user; // Extract user object from GuildMember
                    } catch (error) {
                        const invalidUserEmbed = new EmbedBuilder()
                            .setColor("#ee9090")
                            .setTitle(`Invalid User`)
                            .setDescription(`Could not find a user with ID: ${userId}. Please provide a valid user ID or mention.`)
                            .setTimestamp();
                        msg.channel.send({ embeds: [invalidUserEmbed] });
                        return;
                    }
                } else {
                    targetUser = msg.author;
                }
            }

            const userId = targetUser.id;
            const userBal = await getUsersBalance(userId);

            if (userBal === null) {
                const noBalanceEmbed = new EmbedBuilder()
                    .setColor("#ee9090")
                    .setTitle(`${targetUser.username}'s Balance`)
                    .setDescription(
                        `No balance found for this user. Ensure you have done the .start command. If you feel this is an error feel free to inform me @kira.c`,
                    )
                    .setTimestamp();
                msg.channel.send({ embeds: [noBalanceEmbed] });
                return;
            }

            function numberWithCommas(x) {
                return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            }
            const balWithCommas = numberWithCommas(userBal);

            const balanceEmbed = new EmbedBuilder()
                .setColor("#ffa791")
                .setTitle(`${targetUser.username}'s Balance`)
                .setDescription(
                    "**Balance: **" + Discord.inlineCode(`${balWithCommas}`),
                )
                .setTimestamp();
            msg.channel.send({ embeds: [balanceEmbed] });
        }

        if (command === "pay") {
            const amount = parseFloat(args[args.length - 1]); //amount is last value
            if(args.length > 2){
                msg.reply("Please only input the user id and amount");
                return;
            }
            if ((amount < 0) | !Number.isInteger(amount)) {
                msg.reply(
                    "**You are not allowed to steal monies bad oddy**",
                );
                return;
            }
            let targetUser;
            let userId;
            if (msg.mentions.users.size > 0) {
                targetUser = msg.mentions.users.first();
            } else {
                userId = args.slice(0, -1).join("").trim();
                if (!userId || isNaN(userId)) {
                    msg.reply("Please mention a user or provide a valid user ID.");
                    return;
                }
                try {
                    targetUser = await msg.client.users.fetch(userId);
                } catch (error) {
                    msg.reply("Could not find a user with that ID.");
                    return;
                }
            }
          if (targetUser === msg.author) {
            msg.reply("** Trying to give yourself money? **");
            return;
          }
          if (targetUser === undefined) {
            msg.reply("Please mention a user.");
            return;
          }
          if (isNaN(amount)) {
            msg.reply("Please provide a valid amount!");
            return;
          }
         await payCommand(msg, userId, targetUser, amount);
        }

        if (command === "cd") {
            await getCooldowns(userId, msg);
        }

        if (command === "index") {
            const listOfCards = await getTotalCards("cards");
            let groupName = " ";
            if(args[0] != undefined){
                try{
                    groupName = args.join(" ").toLowerCase().split(/<@!?\d+>/)[0].trim(); // Extract the groupName from the first argument
                    console.log(groupName);{
                        let uniqueGroupNames = [];
                        try{
                           uniqueGroupNames = await getUniqueGroupNames("cards");
                        }catch(error){
                            console.error('Error fetching unique group names:', error);
                        }
                        const namesToLowerCase = uniqueGroupNames.map(name => name.toLowerCase());
                        console.log(namesToLowerCase);

                        const nameIndex = namesToLowerCase.indexOf(groupName);
                        if (nameIndex === -1) {
                            msg.reply("The specified group name does not exist. Ensure spelling is correct.");
                            return;
                        }
                        const originalGroupName = uniqueGroupNames[nameIndex];

                        const filteredCards = await filterByAttribute("cards", "GroupName", originalGroupName);

                        const cardsPerPage = 4;
                        const totalPages = Math.ceil(filteredCards.length / cardsPerPage);
                        try {
                            const embedMessage = await msg.channel.send({
                                embeds: [generateEmbed(0, totalPages, filteredCards, msg)],
                                components: [generateRow(0, totalPages)]
                            });
                            handleCollector(embedMessage, msg, totalPages, filteredCards);
                            return;
                        } catch (error) {
                            console.error("Error creating index embed for: " + groupName);
                            console.error(error); // Log the actual error for further investigation
                        }

                    }
                }catch(error){
                    console.log("No valid group name provided");
                }
                
            }else{
                const cardsPerPage = 4;
                const totalPages = Math.ceil(listOfCards.Items.length / cardsPerPage);

                const embedMessage = await msg.channel.send({ embeds: [generateEmbed(0, totalPages, listOfCards, msg)], components: [generateRow(0, totalPages)] });

                handleCollector(embedMessage, msg, totalPages, listOfCards);
            }        
        }

        if (command === "view" || command === "v") {
            //get second parameter entered by the user and parse that as the cardid to get from table
            const cardId = args.join(" ").trim();
            if(args.length > 1){
                msg.reply("Please only input 1 card id");
                return;
            }
            if (cardId === undefined) {
                msg.reply("**Please input a card id**");
                return;
            }
            (async () => {
                try {
                    const tableName = "cards";
                    // Call the function and store the returned URL in a const
                    const cardToView = await getCardFromTable(
                        tableName,
                        cardId,
                    );
                    const secondTableName = "user-cards";
                    const attributeName = cardToView["card-id"];
                    const numberOfCopies = await getHowManyCopiesOwned(
                        secondTableName,
                        userId,
                        attributeName,
                    );
                    const embed = new EmbedBuilder() //embed that shows the group name, member name, card id and card url
                        .setColor("#feb69e")
                        .setDescription(
                            `You are viewing **${cardToView["GroupName"]} ${cardToView["GroupMember"]}**`,
                        )
                        .setImage(cardToView["cardUrl"]) // changed depending on the card recieved
                    embed.addFields({
                        name: "You Own: ",
                        value: Discord.inlineCode(String(numberOfCopies)),
                        inline: true,
                    })
                    if(numberOfCopies!=0){
                        const userVerOfCard = await getUserCard(secondTableName, userId, cardToView["card-id"]);
                        //get current exp and level
                        embed.addFields({
                            name: 'Your total Exp for this card:',
                            value: `${Discord.inlineCode(String(userVerOfCard[0].totalExp))}`,
                            inline: false
                        })
                    }
                        embed.setFooter({
                            text: msg.author.tag,
                            iconURL: msg.author.displayAvatarURL({
                                dynamic: true,
                            }),
                        })
                        .setTimestamp();
                    msg.reply({ embeds: [embed] });
                } catch (error) {
                    msg.reply("**Please enter a valid card id**");
                    console.log(
                        "Could not find card in table with card-id " + cardId,
                    );
                    console.error("Error:", error);
                }
            })();
        }

        if (command === "gift") {
            const cardIDToGift = args[1];
            const numberOfCopiesToGive = parseFloat(args[2]); //ideally should be !gift @user xyz 3
            let userId = msg.author.id;;
            let targetUser;

            if (msg.mentions.users.size > 0) { //uses the mention
                targetUser = msg.mentions.users.first();
            } else {
                // If no mention, assume the user ID is provided as the first argument
                targetUser = args[0];
                if (targetUser) {
                    targetUser = targetUser.replace(/\D/g, ''); // Remove all non-digit characters
                }
                try {
                    targetUser = await msg.client.users.fetch(targetUser);
                } catch (error) {
                    console.error("Error fetching user:", error);
                    msg.reply("Could not find a user with that ID.");
                    return;
                }
            }

            if (!targetUser) {
                msg.reply("Please mention a user or provide a valid user ID.");
                return;
            }
            if (targetUser.id === "1251915536065892413") {
                msg.reply("** Trying to gift the georgeos danielle? **");
                return;
            }

            if (targetUser === msg.author) {
                msg.reply("** Trying to gift yourself? **");
                return;
            }
            if (isNaN(numberOfCopiesToGive)) {
                msg.reply(
                    "Please ensure you have given a card id and amount to gift",
                ); //theyve tried to give an invalid amount
                return;
            }
            if (numberOfCopiesToGive == 0) {
                msg.reply("Please give a non zero amount to gift"); //theyve tried to give an invalid amount
                return;
            }
            await giftcards(msg, cardIDToGift, userId, targetUser, numberOfCopiesToGive);
        }

        if (command === "favcard") {
            const newFavCard = args.filter(code => code.trim() !== "");
            console.log(newFavCard[0]);
            if(newFavCard[0] === undefined){
                msg.reply("**Please input a code**");
                return;
            }
            if(newFavCard.length > 1){
                msg.reply("**Please only give one code**");
                return;
            }
            try {
                await getCardFromTable("cards", newFavCard[0]);
            } catch (error) {
                msg.reply("**Please input a valid card id**");
                return;
            }
            //check newfaveCard is valid
            const tableName = "Dani-bot-playerbase";

            (async () => {
                try {
                    await setUserCard(tableName, userId, newFavCard[0]);
                    msg.reply(
                        `Your favourite card has been set to **${newFavCard[0]}**`,
                    );
                } catch (error) {
                    msg.reply("Please enter a valid card id");
                    console.log(
                        "Could not find card in table with card-id " +
                            newFavCard,
                    );
                    console.error("Error:", error);
                }
            })();
        }

        if (command === "bio") {
            const newBio = args.join(" "); //get all the shit after
            const tableName = "Dani-bot-playerbase";
            if (newBio === undefined) {
                msg.reply("Please input a bio");
            } else {
                (async () => {
                    try {
                        await setUserBio(tableName, userId, newBio);
                        msg.reply(
                            `You have changed your profile bio to **${newBio}**`,
                        );
                    } catch (error) {
                        console.error("Error:", error);
                    }
                })();
            }
        }

        if(command === "w" || command === "work"){
            const command = "w";
            const workCd = Date.now() + 3600 * 1000;
            const remainingCooldown = await getUserCooldown(userId, command);

            if (remainingCooldown !== '0m 0s') {
                msg.reply(`You must wait ${remainingCooldown} before using this command again.`);
                return;
            }
            const cooldownTimestamp = workCd;
            await saveUserCooldown(userId, command, cooldownTimestamp);
            await work(msg, userId);
        }

        if(command === "wishlist" || command === "wl"){
            const codes = args.filter(code => code.trim() !== "");
            if(codes[0] === undefined){
                msg.reply("**Please input at least one code**");
                return;
            }else{
                if(codes.length > 10){
                    msg.reply("**The limit is 10 codes**");
                    return;
                }else{
                    for(let i = 0; i < codes.length; i++){
                        try{
                            await getCardFromTable("cards", codes[i]);
                        }catch(error){
                            msg.reply("One of your codes is invalid: " + Discord.inlineCode(codes[i]));
                            return;
                        }
                        
                    }
                    const codesString = codes.join(', ');
                    await setUserWishList("Dani-bot-playerbase", userId, codesString);
                    msg.reply(`You have added the following cards to your wishlist: ${codesString}`);
                }
            }
            
        }

        if(command === "daily"){
            const dailyCd = Date.now() + 72000 * 1000;
            const remainingCooldown = await getUserCooldown(userId, command);

            if (remainingCooldown !== '0m 0s') {
                msg.reply(`You must wait ${remainingCooldown} before using this command again.`);
                return;
            }
            const cooldownTimestamp = dailyCd;
            await saveUserCooldown(userId, command, cooldownTimestamp);
            const streak = await getUser(userId);
            const streakNumber = streak["DailyStreak"];
            await setUserStreak("Dani-bot-playerbase",userId, (streakNumber + 1));
            const user = await getUser(userId);
            if(user.Reminders === true){
                setTimeout(() => {
                    msg.channel.send(`**Reminder:** <@${msg.author.id}> your daily is ready!`);
                }, 72000 * 1000); // Convert minutes to milliseconds
            }
            getDaily(msg, userId);
        }

        if (command === "inv") {
            let userId;
            let groupName = "";

            if (args[0] !== undefined) {
                const input = args.join(" ");
                const mentionedIndex = input.indexOf("<@");

                // Extract group name based on mention presence
                if (mentionedIndex !== -1) {
                    groupName = input.substring(0, mentionedIndex).trim().toLowerCase();
                } else {
                    groupName = args[0].toLowerCase().trim(); // Group name is the first argument
                }

                if (msg.mentions.users.size > 0) {
                    userId = msg.mentions.users.first().id;
                } else {
                    // If no mention, assume the last argument is the userId
                    const potentialUserId = args[args.length - 1];
                    if (potentialUserId.match(/^\d{17,19}$/)) {
                        userId = potentialUserId;
                        args.pop(); // Remove the userId from args
                    } else {
                        // If not a valid user ID, assume the rest of the arguments are the user ID
                        userId = args.slice(1).join(" ").trim();
                    }
                }
            } else {// no group given
                if (msg.mentions.users.size > 0) {
                    userId = msg.mentions.users.first().id;
                } else {
                    userId = args.join(" ").trim();
                }
            }
            if (!userId || userId === msg.author.id) {
                userId = msg.author.id;
            }

            let uniqueGroupNames = [];
            try {
                uniqueGroupNames = await getUniqueGroupNames("cards");
            } catch (error) {
                console.error('Error fetching unique group names:', error);
                return;
            }

            if (args[0] !== undefined) {
                const namesToLowerCase = uniqueGroupNames.map(name => name.toLowerCase());
                const nameIndex = namesToLowerCase.indexOf(groupName);

                if (nameIndex === -1) {
                    msg.reply("The specified group name does not exist. Ensure spelling is correct.");
                    return;
                }

                const originalGroupName = uniqueGroupNames[nameIndex];
                let filteredCards = [];

                try {
                    filteredCards = await filterByAttribute("cards", "GroupName", originalGroupName);
                } catch (error) {
                    console.error("Error filtering cards by group name:", error);
                    return;
                }

                const cardsPerPage = 4;
                const totalPages = Math.ceil(filteredCards.length / cardsPerPage);

                try {
                    const embedMessage = await msg.channel.send({
                        embeds: [await generateEmbedInvForGroup(0, totalPages, filteredCards, msg, userId)],
                        components: [generateRowInv(0, totalPages)]
                    });
                    handleCollectorInvForGroup(embedMessage, msg, totalPages, filteredCards, userId);
                } catch (error) {
                    console.log("Error:", error);
                }
            } else {
                let listOfCards = [];

                try {
                    listOfCards = await getUserCards("user-cards", userId);
                } catch (error) {
                    console.log("Error getting user cards:", error);
                    return;
                }

                const cardsPerPage = 4;
                const totalPages = Math.ceil(listOfCards.length / cardsPerPage);

                try {
                    const embedMessage = await msg.channel.send({
                        embeds: [await generateEmbedInv(0, totalPages, listOfCards, msg, userId)],
                        components: [generateRowInv(0, totalPages)]
                    });
                    handleCollectorInv(embedMessage, msg, totalPages, listOfCards, userId);
                } catch (error) {
                    console.log("Error:", error);
                }
            }
        }

        if(command === "feed"){
            const input = args.filter(code => code.trim() !== "");
            const cardId = input[0];
            const numberOfCards = input[1];
            const temp = await awardExp(userId, String(cardId), numberOfCards, msg);
            const amountOwnedBefore = await getHowManyCopiesOwned("user-cards", userId, cardId);
            const newAmountOwner = amountOwnedBefore - numberOfCards;
            if(temp === 0){
                msg.reply("**You do not own this card**");
                return;
            }
            if(temp === 1){
                msg.reply("**You do not own enough copies**");
                return;
            }
            if(temp === 2){
                msg.reply("**Your card is already at max level!**");
                return;
            }
            await changeNumberOwned("user-cards", userId, cardId, newAmountOwner);
        }

        if(command === "upgrade"){
            const input = args.filter(code => code.trim() !== "");
            const code = input[0];
            const status = await upgrade(userId, code, msg);
            if(status === true){
                return;
            }else if(status===false){
                msg.reply("Your card is too low level to upgrade");
                return;
            }
        }

        if(command === "help"){
            const embed = helpCommand(0);
            const pages = 4;
            const components = pages > 1 ? [generateRowHelp(0, pages)] : [];

            msg.reply({ embeds: [embed], components: components }).then(sentMsg => {
                handleCollectorHelp(sentMsg, msg);
            }).catch(console.error); // Catch errors for debugging
        }

        if(command === "remindersoff"){
            const userId = msg.author.id;
            await setAutoReminders("Dani-bot-playerbase", userId, false);

            const embed = new EmbedBuilder()
                .setColor('#d81159')
                .setTitle('Auto Reminders Turned Off')
                .setDescription(`You will no longer receive reminders for claims, drops, and daily.`)
                .setTimestamp();

            msg.channel.send({ embeds: [embed] });
        }
        
        if(command === "reminderson"){
            const userId = msg.author.id;
            await setAutoReminders("Dani-bot-playerbase", userId, true);

            const embed = new EmbedBuilder()
                .setColor('#04a777')
                .setTitle('Auto Reminders Turned On')
                .setDescription(`You will now receive reminders for claims, drops, and daily.`)
                .setTimestamp();

            msg.channel.send({ embeds: [embed] });
        }

        if(command === "dg"){
            const dgCd = Date.now() + 14400 * 1000; //
            const remainingCooldown = await getUserCooldown(userId, command);

            if (remainingCooldown !== '0m 0s') {
                msg.reply(`You must wait ${remainingCooldown} before using this command again.`);
                return;
            }
            const input = args.filter(code => code.trim() !== "");
            const code = input[0];
            const dgToEnter = input[1];
            if(code === "1"){
                msg.reply("Challange the boss JYP to recieve 0-1 cards of your chosen card and between 5000- 7000 currency on win!")
                return;
            }
            if(code === "2"){
                msg.reply("Challange the boss SM to recieve 1-2 cards of your chosen card and between 7500 - 10000 currency on win!")
                return;
            }
            if(code === "3"){
                msg.reply("Challange the boss SM to recieve 2-3 cards of your chosen card and between 10000 - 15000 currency on win!")
                return;
            }
            try{
                await getCardFromTable("cards", code);
            }catch(error){
                msg.reply("Please input a valid card id");
                console.log("Error:", error);
                return;
            }

            if(!dgToEnter){
                try{
                    const card = await getCardFromTable("cards", code);
                    const userOwns = await checkIfUserOwnsCard("user-cards", userId, code);
                    if(userOwns===0){
                        msg.reply("You do not own this card");
                        return;
                    }
                    msg.reply("You are viewing the win rates for: " + Discord.inlineCode(code) + ". To enter a dg please input a code and either a value of 1,2,3");
                    const cardId = card["card-id"];
                    const embed = await dgWinRates(msg, userId, cardId);
                    msg.channel.send({ embeds: [embed] });
                }catch(error){
                    console.log(error);
                    msg.reply("Please input a valid card id");
                    return;
                }
            }else{
                const userOwns = await checkIfUserOwnsCard("user-cards", userId, code);
                if(userOwns===0){
                    msg.reply("You do not own this card");
                    return;
                }
                const cooldownTimestamp = dgCd;
                await saveUserCooldown(userId, command, cooldownTimestamp);
                const user = await getUser(userId);
                if(user.Reminders === true){
                    setTimeout(() => {
                        msg.channel.send(`**Reminder:** <@${msg.author.id}> your dg is ready!`);
                    }, 14400 * 1000); // Convert minutes to milliseconds
                }
                await enterDg(msg, userId, code, dgToEnter);
            }
        }

        if(command === "forcedrop" || command === "fd"){
            // Check if the user has the required role
            const REQUIRED_ROLE_NAME = 'admin';
            const role = msg.guild.roles.cache.find(role => role.name === REQUIRED_ROLE_NAME);
            if (role && msg.member.roles.cache.has(role.id)) {
                getClaim(msg,userId); //maybe change in future idk works for now
            } else {
                return;
            }
        }

        if(command === "modify"){
            let user = " ";
            const REQUIRED_ROLE_NAME = 'admin';
            let amount = 0;
            const role = msg.guild.roles.cache.find(role => role.name === REQUIRED_ROLE_NAME);
            if (role && msg.member.roles.cache.has(role.id)) {
                if (msg.mentions.users.size > 0) { // Checks if someone has been mentioned
                    user = msg.mentions.users.first().id;
                } else {
                    if (args[0] != undefined) {
                        user = String(args[0]).trim();
                        const userExists = await checkUserExists(user);
                        if(!userExists){
                            msg.reply("User does not exist in database");
                            return;
                        }
                    } else {
                        msg.reply("Please provide a valid user ID.");
                        return;
                    }
                }
                if (args.length >= 1) {
                    if(args[1] =! undefined){
                        const amountStr = String(args[1]).trim();
                        if (!amountStr || isNaN(amountStr)) {
                            msg.reply("Please provide a valid amount.");
                            return;
                        } else {
                            amount = parseFloat(amountStr);
                        }
                    }else{
                        msg.reply("Please provide a valid amount.");
                    }
                } 
                try{
                    saveUserBalance(user, amount);

                    const embed = new Discord.EmbedBuilder()
                        .setTitle('Balance Modified')
                        .setColor('#04a777')
                        .addFields(
                            { name: 'User ID', value: user, inline: true },
                            { name: 'Amount', value: amount.toString(), inline: true }
                        )
                        .setTimestamp()

                    msg.channel.send({ embeds: [embed] });                    
                }catch(error){
                    console.log(error);
                    msg.reply("An error occurred while modifying the balance.");
                }
            } else {
                return;
            }
        }

        if(command === "createraffle"){
            const REQUIRED_ROLE_NAME = 'Admin'; //change back to admin
            const role = msg.guild.roles.cache.find(role => role.name === REQUIRED_ROLE_NAME);
            if (role && msg.member.roles.cache.has(role.id)) {
            sendRaffleEmbed();
            }else{
                return;
            }
        }
    }
});

async function sendRaffleEmbed() {
    const channel = client.channels.cache.get('1255811550451859536');
    if (!channel) return;
    await forceRaffle(channel, client);
}

client.login(process.env.Token);
