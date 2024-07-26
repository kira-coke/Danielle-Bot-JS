require("dotenv").config();
const prefix = ".";
let isLocked = false;
const Discord = require("discord.js");
const AWS = require("aws-sdk");
const schedule = require('node-schedule');
AWS.config.update({
    accessKeyId: process.env["Access_key"],
    secretAccessKey: process.env["Secret_access_key"],
    region: "eu-west-2",
});
const{work} = require("./work");
const {forceRaffle, changeRaffleRewards} = require("./raffle");
const {getCooldowns} = require("./cooldowncommand.js");
const {giftcards, massGift} = require("./gift.js");
const {awardExp, upgrade, groupFeed} = require("./cardExpSystem.js");
const {saveUserBalance} = require("./userBalanceCmds.js");
const {saveUserData,checkUserExists,checkUserDisabled,setUserCard,setUserBio,setUserWishList,getUser,setAutoReminders, getUserCards, getUserWishList, setUserAlbum, setDisplayPreference} = require("./users.js");
const {saveUserCooldown,getUserCooldown, setPendingReminders, getCoolDownStatus, updateCoolDownStatus} = require("./cooldowns");
const {getHowManyCopiesOwned,getCardFromTable,getTotalCards,changeNumberOwned, filterByAttribute, getUserCard, checkIfUserOwnsCard, getCardsWithLevels, addcardToCards, getUserCustomCards, modGiftCard, getEventCards, storeDiscordCachedUrl, downloadImage, writeToDynamoDB} = require("./cards");
const {getUserProfile} = require("./profile.js");
const {generateEmbedInvForGroup, generateRowInv, handleCollectorInv, getUniqueGroupNames, generateEmbedInv, handleCollectorInvForGroup, generateRowInvForGroup } = require("./inventory.js");
const {generateEmbed, generateRow, handleCollector } = require("./indexCmd.js");
const {getUsersBalance} = require("./userBalanceCmds");
const {getClaim} = require("./claim.js");
const {getDrop} = require("./drop.js");
const {getDaily} = require("./daily.js");
const {GatewayIntentBits, PermissionsBitField, AttachmentBuilder} = require("discord.js");
const {payCommand} = require("./pay.js");
const {setUserStreak} = require("./updateDailyStreak.js")
const { helpCommand, handleCollectorHelp, generateRowHelp, specificHelpCommand } = require("./help.js");
const{enterDg, dgWinRates} = require("./dungeons.js");
const {openShop, purchaseItem, packOpen} = require("./shop.js");
const { getPacks, removePack, getEventRolls, getAlbumTokens, removeAlbumToken} = require("./userAssets");
const {displayLeaderboard} = require("./leaderboards.js");
const {setUserQuests, getUserQuests, createQuestEmbed, handleClaimAction, handleDropAction, handleWorkAction, changeQuestRwards, handleCardAction} = require("./quests.js");
const {addToGTS, getUserGTS, getMissingIds, globalTradeStationEmbed, getTradeByGlobalTradeId, deleteTradeByGlobalTradeId, removeFromUserInv, addToUserInv, userGlobalTradeStationEmbed, handleCollectorGts, filterTrades, filteredTradeEmbed} = require("./globalTradeStation.js");
const {sortCommunityOut, updateUserDgStats, updateComDgStats} = require("./community.js");
const {createAlbum, addCardToAlbum, deleteAlbum, getAlbums, generateAlbumImage, getAlbum, removeCard, replaceCard} = require("./albums.js");
const {eventRoll, initiateEventRoll} = require("./event_le.js");
const {checkUserInTable, checkCardTier, checkDaily, checkCardCount, checkTotalExp, handleCollectorAchievements, achievementsCommand, generateRowAchievements} = require("./achievements.js");
const client = new Discord.Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers, //commend back in and our depending on which bot testing on
    ],
});
const {EmbedBuilder, ActivityType, inlineCode} = require("discord.js");
const fs = require('fs');
const path = require('path');
const originalLog = console.log;
const originalError = console.error;
const currencyEmote = '<:DB_currency:1257694003638571048>'; 
const eventRollEmote = '<:event_roll:1261060311813718187>'; 

console.log = function(...args) {
    const timestamp = new Date().toISOString();
    originalLog.apply(console, [`[${timestamp}]`, ...args]);
};
console.error = function(...args) {
    const timestamp = new Date().toISOString();
    originalError.apply(console, [`[${timestamp}]`, ...args]);
};
client.once('ready', async () => {
    console.log('Bot is online!');
    try {
        await setPendingReminders(client); // comment in and out depending on which bot testing on
        setInterval(async () => {
            await setPendingReminders(client);
        }, 2 * 60 * 1000); // comment in and out depending on which bot testing on
    } catch (error) {
        console.log("Error setting pending reminders", error);
    }
});

client.on("ready", () => {
    console.log(`Logged in as ${client.user.tag}!`);
    process.on('uncaughtException', async (error) => {
        const ROLE_ID = '1255321385765699604';
        console.error('Uncaught Exception:', error);
        try {
            const channel = client.channels.cache.get('1256332210961911939');
            if (channel) {
                await channel.send(`<@&${ROLE_ID}> Bot crashed and restarted due to an uncaught exception.`);
                console.log('Uncaught exception notification sent to the channel.');
            } else {
                console.error('Channel not found.');
            }
        } catch (sendError) {
            console.error('Error sending message to the channel:', sendError);
        }
        process.exit(1); // Exit and let PM2 restart the bot
    });

    process.on('unhandledRejection', async (reason, promise) => {
        const ROLE_ID = '1255321385765699604';
        console.error('Unhandled Rejection at:', promise, 'reason:', reason);
        try {
            const channel = client.channels.cache.get('1256332210961911939');
            if (channel) {
                await channel.send(`<@&${ROLE_ID}> Bot crashed and restarted`);
                console.log('Notification sent to the channel.');
            } else {
                console.error('Channel not found.');
            }
        } catch (sendError) {
            console.error('Error sending message to the channel:', sendError);
        }
        process.exit(1); // Exit and let PM2 restart the bot
    });
    try {
        client.user.setPresence({
            status: 'online',
            activities: [{
                name: 'Hype Boy',
                type: ActivityType.Listening,
            }],
        });
    } catch (error) {
        console.error('Error setting presence:', error);
    }
    schedule.scheduleJob('*/20 * * * *', () => {
        if (!isLocked) {
            sendRaffleEmbed();
        }
    });
});

let lockMessage = '';

client.on("messageCreate", async (msg) => {
    if (msg.content.startsWith(prefix)) {
        if (!msg.guild) return;
        if (msg.content === '.crash' && msg.member.permissions.has('mod')){
            msg.channel.send("Simulating a crash");
            throw new Error('Simulating a crash');
        }
        if (msg.content === '.restart' && msg.member.permissions.has('mod')) {
            msg.channel.send('Restarting...')
                .then(() => {
                    process.exit();
                });
        }
        if (msg.content === ".checkpermissions") {
            try {
                const requiredPermissions = [
                    PermissionsBitField.Flags.ManageMessages,
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages,
                    PermissionsBitField.Flags.ReadMessageHistory, // Add this to view messages history
                ];

                // Check the bot's permissions in the current channel
                const botPermissions = msg.channel.permissionsFor(
                    msg.guild.members.me,
                );
                if (!botPermissions) {
                    console.log(
                        "I can't determine my permissions in this channel.",
                    );
                    return;
                }
                const missingPermissions = requiredPermissions.filter(
                    (permission) => !botPermissions.has(permission),
                );
                if (missingPermissions.length > 0) {
                    console.log(
                        `I am missing the following permissions in this channel: ${missingPermissions.map((perm) => PermissionsBitField.Flags[perm]).join(", ")}`,
                    );
                } else {
                    console.log(
                        "I have all the necessary permissions in this channel.",
                    );
                }
            } catch (error) {
                console.error(
                    "An error occurred while checking permissions:",
                    error,
                );
                //("An error occurred while checking permissions. Please try again.");
            }
        }
        try{
            const requiredPermissions = [
                PermissionsBitField.Flags.ManageMessages,
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.ReadMessageHistory, // Add other necessary permissions as needed
                ];
            const botPermissions = msg.channel.permissionsFor(msg.guild.members.me);
            if (!botPermissions || requiredPermissions.some(permission => !botPermissions.has(permission))) {
              console.log(`Bot lacks required permissions in channel ${msg.channel.name} (${msg.channel.id}).`);
              return;
            }
            let args = msg.content.slice(prefix.length).trim().split(" ");
            const command = args.shift().toLowerCase();
            const userId = msg.author.id;
            const authorTag = `${msg.author.username}#${msg.author.discriminator}`;
            const userExists = await checkUserExists(userId);
            const generalCmdCd = Date.now() + 1 * 1000;
            const member = msg.member;
            const channel = msg.channelId;
            const remainingCooldown = await getUserCooldown(userId, "generalCmdCd");

            if (command === 'addcard' && msg.member.permissions.has('mod')) {
                const contentWithoutPrefix = msg.content.slice(prefix.length).trim();
                const [cmd, ...args] = contentWithoutPrefix.match(/(?:[^\s"]+|"[^"]*")+/g).map(arg => arg.replace(/"/g, ''));
                console.log(args);
                if (args.length < 7) {
                    return msg.reply('Not enough arguments provided. Usage: .addcard card-id cardRarity cardUrl GroupMember GroupName Theme version');
                }
                if(args.length > 7){
                    return msg.reply('Too many arguments provided. Usage: .addcard card-id cardRarity cardUrl GroupMember GroupName Theme version');
                }
                await addcardToCards(args, msg);
            }

            if (remainingCooldown !== "0m 0s") {
                msg.reply(
                    `Please wait ${remainingCooldown} before doing another command`,
                );
                return;
            }
            const cooldownTimestamp = generalCmdCd;
            await saveUserCooldown(userId, "generalCmdCd", cooldownTimestamp);

            if (msg.author.bot) return;
        
            try{
                if (command === 'togglelock') {
                    const REQUIRED_ROLE_NAME = "mod"; // change to "admin" if necessary
                    const role = msg.guild.roles.cache.find(role => role.name === REQUIRED_ROLE_NAME);
                    if (!role || !msg.member.roles.cache.has(role.id)) {
                        return msg.channel.send('You do not have the required role to use this command.');
                    }

                    isLocked = !isLocked;
                    const status = isLocked ? 'idle' : 'online';
                    lockMessage = args.join(' ');
                    const statusMessage = `Bot is now ${isLocked ? 'under maintenance': 'operational'}.`;
                    try {
                        client.user.setPresence({
                            status: status,
                            activities: [{
                                name: 'Hype Boy',
                                type: ActivityType.Listening,
                            }],
                        });
                    } catch (error) {
                        console.error('Error setting presence:', error);
                    }
                    return msg.channel.send(statusMessage);
                }

                if (isLocked) {
                    const REQUIRED_ROLE_NAME = "mod"; // change to "admin" if necessary
                    const role = msg.guild.roles.cache.find(role => role.name === REQUIRED_ROLE_NAME);
                    const ROLENAME = "coder";
                    const secondRole = msg.guild.roles.cache.find(secondRole => secondRole.name === ROLENAME);
                    if (!role || !msg.member.roles.cache.has(role.id)) {
                        if(lockMessage.length === 0){
                            return msg.channel.send('Bot is under maintenance, please try again later.');
                        }else{
                            return msg.channel.send(lockMessage);
                        }
                    }else{
                        if (!secondRole || !msg.member.roles.cache.has(secondRole.id)) {
                            if (command != "togglelock" && command != "addcard" && command != "index") {
                                if(lockMessage.length != 0){
                                    return msg.channel.send(lockMessage);
                                }else{
                                    return msg.channel.send('Bots under maint annoying fucks (jk love u but its under maint pookies.)');
                                }
                            }
                        }
                    }
                }
            }catch(error){
                console.log("Error checking lock status:", error);
            }
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
                try {
                    await getUserProfile(msg, userId);
                } catch (error) {
                    msg.reply("Please input only the user id");
                }
                try{
                    const user = await getUser(userId);
                    console.log(user);
                    await checkDaily(userId, user.DailyStreak, msg);
                    await checkCardCount(userId, user.cardCount, msg);
                    await checkTotalExp(userId, user.TotalExp, msg);
                }catch(error){
                    console.log("Error checking user data or achievements:", error)
                }
            }

            if(command === "favalbum" || command === "fa"){
                const newFavALbum = args.filter((code) => code.trim() !== "");
                console.log(newFavALbum[0]);
                try{
                    await getAlbum(userId, newFavALbum[0]);
                }catch(error){
                    msg.reply("You do not have an album with that name");
                    return;
                }
                await setUserAlbum("Dani-bot-playerbase", userId, newFavALbum[0]);
                msg.reply("You have set your favourite album to " + newFavALbum[0]);
            }

            if(command === "toggleprofile"){
                let preferance = args[0];
                if(preferance === "favcard"){
                    preferance = "favCard";
                }
                if(preferance === "favalbum"){
                    preferance = "favAlbum";
                }
                await setDisplayPreference("Dani-bot-playerbase", userId, preferance);
                msg.reply("You have successfully changed your display preference to: " + Discord.inlineCode(preferance));
            }

            if (command === "c" || command === "claim") {
                const command = "claim";
                const defaultCooldown = 300 * 1000; // 300 seconds
                let claimCd = defaultCooldown;
                if (hasRole(member, "booster")) {
                    claimCd *= 0.8;
                } else if (hasRole(member, "supporter")) {
                    claimCd *= 0.6;
                }
                const remainingCooldown = await getUserCooldown(userId, command);
                if (remainingCooldown !== "0m 0s") {
                    msg.reply(
                        `You must wait ${remainingCooldown} before using this command again.`,
                    );
                    return;
                }
                const cooldownTimestamp = Date.now() + claimCd;
                const reminderTimestamp = cooldownTimestamp;
                await saveUserCooldown(userId, command, cooldownTimestamp, channel, reminderTimestamp);
                const user = await getUser(userId);
                if (user.Reminders === true) {
                    setTimeout(async () => {
                        const newStatus = await updateCoolDownStatus(userId, command, false);
                        //console.log(newStatus);
                        msg.channel.send(
                            `**Reminder:** <@${msg.author.id}> your claim is ready!`,
                        );
                    }, claimCd);
                }
                await getClaim(msg, userId);
                await handleClaimAction(userId, msg); //quest handling 
                await handleCardAction(userId, msg, "card");
                await updateComDgStats(userId, 1);
                await updateUserDgStats(userId, 1);
            }

            if (command === "d" || command === "drop") {
                const command = "drop";
                const defaultCooldown = 600 * 1000; // 600 seconds
                let dropCd = defaultCooldown;
                if (hasRole(member, "booster")) {
                    dropCd *= 0.8;
                } else if (hasRole(member, "supporter")) {
                    dropCd *= 0.6;
                }
                const remainingCooldown = await getUserCooldown(userId, command);

                if (remainingCooldown !== "0m 0s") {
                    msg.reply(
                        `You must wait ${remainingCooldown} before using this command again.`,
                    );
                    return;
                }
                const cooldownTimestamp = Date.now() + dropCd;
                const reminderTimestamp = cooldownTimestamp;
                await saveUserCooldown(userId, command, cooldownTimestamp, channel, reminderTimestamp);
                const user = await getUser(userId);
                if (user.Reminders === true) {
                    setTimeout(async () => {
                        const newStatus = await updateCoolDownStatus(userId, command, false);
                        //console.log(newStatus);
                        msg.channel.send(
                            `**Reminder:** <@${msg.author.id}> your drop is ready!`,
                        );
                    }, dropCd);
                }
                //getDrop(msg, userId);
                await getClaim(msg, userId);
                await handleDropAction(userId, msg);
                await handleCardAction(userId, msg, "card");
                await updateComDgStats(userId, 2);
                await updateUserDgStats(userId, 2);
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
                                .setDescription(
                                    `Could not find a user with ID: ${userId}. Please provide a valid user ID or mention.`,
                                )
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
                const albumTokens = await getAlbumTokens(userId);
                const evenRollTokens = await getEventRolls(userId);

                const balanceEmbed = new EmbedBuilder()
                    .setColor("#ffa791")
                    .setTitle(`${targetUser.username}'s Balance`)
                    .setDescription(
                        "**Balance: **" + Discord.inlineCode(`${balWithCommas}`) + currencyEmote,
                    )
                    .addFields(
                        { name: ' ', value: `**Event roll tokens**: ` + Discord.inlineCode(evenRollTokens.toString()) + eventRollEmote, inline: false }) 
                    .addFields(
                        { name: ' ', value: `**Album Tokens**: ` + Discord.inlineCode(albumTokens.toString()), inline: true } // Assuming albumTokens is the variable holding the token count
                    )
                    .setTimestamp();
                msg.channel.send({ embeds: [balanceEmbed] });
            }

            if (command === "pay") {
                const amount = parseFloat(args[args.length - 1]); //amount is last value
                if (args.length > 2) {
                    msg.reply("Please only input the user id and amount");
                    return;
                }
                if ((amount < 0) | !Number.isInteger(amount)) {
                    msg.reply("**You are not allowed to steal monies bad oddy**");
                    return;
                }
                let targetUser;
                if (msg.mentions.users.size > 0) {
                    targetUser = msg.mentions.users.first();
                } else {
                    targetUser = args.slice(0, -1).join("").trim();
                    console.log(targetUser);
                    if (!targetUser || isNaN(targetUser)) {
                        msg.reply(
                            "Please mention a user or provide a valid user ID.",
                        );
                        return;
                    }
                    try {
                        targetUser = await msg.client.users.fetch(targetUser);
                    } catch (error) {
                        msg.reply("Could not find a user with that ID.");
                        return;
                    }
                }
                console.log(targetUser);
                console.log(msg.author);
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
                console.log(userId);
                console.log(targetUser);
                await payCommand(msg, userId, targetUser, amount);
            }

            if (command === "cd") {
                await getCooldowns(userId, msg);
            }

            if (command === "index") {
                const listOfCards = await getTotalCards("cards");
                let groupName = " ";
                if (args[0] != undefined) {
                    try {
                        groupName = args
                            .join(" ")
                            .toLowerCase()
                            .split(/<@!?\d+>/)[0]
                            .trim(); // Extract the groupName from the first argument
                        let uniqueGroupNames = [];
                        try {
                            uniqueGroupNames = await getUniqueGroupNames("cards");
                        } catch (error) {
                            console.error(
                                "Error fetching unique group names:",
                                error,
                            );
                        }
                        const namesToLowerCase = uniqueGroupNames.map((name) =>
                            name.toLowerCase(),
                        );

                        const nameIndex = namesToLowerCase.indexOf(groupName);
                        if (nameIndex === -1) {
                            msg.reply(
                                "The specified group name does not exist. Ensure spelling is correct.",
                            );
                            return;
                        }
                        const originalGroupName = uniqueGroupNames[nameIndex];

                        const filteredCards = await filterByAttribute(
                            "cards",
                            "GroupName",
                            originalGroupName,
                        );

                        const cardsPerPage = 7;
                        const totalPages = Math.ceil(
                            filteredCards.length / cardsPerPage,
                        );
                        try {
                            const embedMessage = await msg.channel.send({
                                embeds: [
                                    generateEmbed(
                                        0,
                                        totalPages,
                                        filteredCards,
                                        msg,
                                    ),
                                ],
                                components: [generateRow(0, totalPages)],
                            });
                            handleCollector(
                                embedMessage,
                                msg,
                                totalPages,
                                filteredCards,
                            );
                            return;
                        } catch (error) {
                            console.error(
                                "Error creating index embed for: " + groupName,
                            );
                            console.error(error); // Log the actual error for further investigation
                        }
                    } catch (error) {
                        console.log("No valid group name provided");
                    }
                } else {
                    const cardsPerPage = 7;
                    const totalPages = Math.ceil(
                        listOfCards.Items.length / cardsPerPage,
                    );

                    const embedMessage = await msg.channel.send({
                        embeds: [
                            generateEmbed(0, totalPages, listOfCards.Items, msg),
                        ],
                        components: [generateRow(0, totalPages)],
                    });

                    handleCollector(
                        embedMessage,
                        msg,
                        totalPages,
                        listOfCards.Items,
                    );
                }
            }

            if (command === "view" || command === "v") {
                //get second parameter entered by the user and parse that as the cardid to get from table
                let cardId = args.join(" ").trim();
                if (args.length > 1) {
                    msg.reply("Please only input 1 card id");
                    return;
                }
                if (cardId === undefined) {
                    msg.reply("**Please input a card id**");
                    return;
                }
                if(cardId === "fc"){
                    const user = await getUser(userId);
                    cardId = user["FavCard"];
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
                                `You are viewing **${cardToView["GroupName"]} ${cardToView["GroupMember"]}** (${cardToView["Theme"]})`,
                            )
                            //.setImage(cardToView["cardUrl"]); // changed depending on the card recieved
                        // Path to your image file
                        const imageUrl = cardToView["cardUrl"];
                        if (imageUrl) {
                            // Ensure the temp directory exists
                            const tempDir = path.join(__dirname, 'temp');
                            if (!fs.existsSync(tempDir)) {
                                fs.mkdirSync(tempDir);
                            }

                            // Download the image to a temporary file
                            const tempImagePath = path.join(tempDir, `${cardToView["card-id"]}.jpg`);
                            console.log(tempImagePath);
                            await downloadImage(imageUrl, tempImagePath);

                            const file = new AttachmentBuilder(tempImagePath, { name: 'card-image.jpg' });
                            embed.setImage('attachment://card-image.jpg');

                            embed.addFields({
                                name: "You Own: ",
                                value: inlineCode(String(numberOfCopies)),
                                inline: true,
                            });
                            if (numberOfCopies != 0) {
                                const userVerOfCard = await getUserCard(secondTableName, userId, cardToView["card-id"]);
                                embed.addFields({
                                    name: "Your total Exp for this card:",
                                    value: `${inlineCode(String(userVerOfCard[0].totalExp))}`,
                                    inline: false,
                                });
                                embed.addFields({
                                    name: "Your level for this card:",
                                    value: `${inlineCode(String(userVerOfCard[0].level))}`,
                                    inline: false,
                                });
                                embed.addFields({
                                    name: "Current tier:",
                                    value: `${inlineCode(String(userVerOfCard[0].tier))}`,
                                    inline: false,
                                });
                            }
                            embed.setFooter({
                                text: msg.author.tag,
                                iconURL: msg.author.displayAvatarURL({ dynamic: true }),
                            }).setTimestamp();

                            const sentMessage = await msg.reply({ embeds: [embed], files: [file] });
                            const discordCachedUrl = sentMessage.embeds[0].image.proxyURL;
                            await storeDiscordCachedUrl(cardToView["card-id"], discordCachedUrl);

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
                        msg.reply("**Please enter a valid card id**");
                        console.log(
                            "Could not find card in table with card-id " + cardId,
                        );
                        console.error("Error:", error);
                    }
                    try{
                        await checkCardTier(userId, cardId, msg);    
                    }catch(error){
                        console.log("Error checking card tier");
                    }
                })();
            }

            if (command === "gift") {
                const cardIDToGift = args[1];
                let numberOfCopiesToGive = parseFloat(args[2]); //ideally should be !gift @user xyz 3
                let userId = msg.author.id;
                let targetUser;

                if (msg.mentions.users.size > 0) {
                    //uses the mention
                    targetUser = msg.mentions.users.first();
                } else {
                    // If no mention, assume the user ID is provided as the first argument
                    targetUser = args[0];
                    if (targetUser) {
                        targetUser = targetUser.replace(/\D/g, ""); // Remove all non-digit characters
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
                if (isNaN(numberOfCopiesToGive) || args.length < 3) {
                    numberOfCopiesToGive = 1;
                }
                if (isNaN(numberOfCopiesToGive)) {
                    msg.reply("Please ensure you have entered a valid number.");
                    return;
                }
                if (numberOfCopiesToGive === 0) {
                    msg.reply("Please give a non zero amount to gift"); //theyve tried to give an invalid amount
                    return;
                }
                if(numberOfCopiesToGive === undefined){
                    numberOfCopiesToGive = 1;
                }
                console.log(numberOfCopiesToGive);
                await giftcards(
                    msg,
                    cardIDToGift,
                    userId,
                    targetUser,
                    numberOfCopiesToGive,
                );
            }

            if (command === "mg" || command === "massgift") {
                const userId = msg.author.id;
                let targetUser;
                let argsIndex = 1;

                if (msg.mentions.users.size > 0) {
                    // uses the mention
                    targetUser = msg.mentions.users.first();
                    argsIndex = 1;
                } else {
                    // If no mention, assume the user ID is provided as the first argument
                    targetUser = args[0];
                    if (targetUser) {
                        targetUser = targetUser.replace(/\D/g, ""); // Remove all non-digit characters
                        argsIndex = 1;
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

                // Parse the card IDs and numbers of copies
                const cardGiftArgs = args.slice(argsIndex);
                console.log(cardGiftArgs);
                if (cardGiftArgs.length % 2 !== 0) {
                    msg.reply("Please provide card IDs and number of copies in pairs.");
                    return;
                }
                console.log(cardGiftArgs.length);
                if(cardGiftArgs.length > 20){
                    msg.reply("You can only gift 10 sets of cards at a time");
                    return;
                }
                const gifts = [];
                for (let i = 0; i < cardGiftArgs.length; i += 2) {
                    const cardID = cardGiftArgs[i];
                    const numberOfCopiesToGive = parseFloat(cardGiftArgs[i + 1]);
                    if (isNaN(numberOfCopiesToGive) || numberOfCopiesToGive <= 0) {
                        msg.reply(`Please provide a valid number of copies for card ID ${cardID}.`);
                        return;
                    }
                    gifts.push({ cardID, numberOfCopiesToGive });
                }

                await massGift(msg, userId, targetUser, gifts);
            }

            if (command === "favcard" || command === "fc") {
                const newFavCard = args.filter((code) => code.trim() !== "");
                console.log(newFavCard[0]);
                if (newFavCard[0] === undefined) {
                    msg.reply("**Please input a code**");
                    return;
                }
                if (newFavCard.length > 1) {
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

            if (command === "w" || command === "work") {
                const command = "work";
                const workCd = 3600 * 1000; //3600
                const remainingCooldown = await getUserCooldown(userId, command);

                if (remainingCooldown !== "0m 0s") {
                    msg.reply(
                        `You must wait ${remainingCooldown} before using this command again.`,
                    );
                    return;
                }
                const cooldownTimestamp = Date.now() + workCd;
                const reminderTimestamp = cooldownTimestamp;
                await saveUserCooldown(userId, command, cooldownTimestamp, channel, reminderTimestamp);
                const user = await getUser(userId);
                if (user.Reminders === true) {
                    setTimeout(async () => {
                        const newStatus = await updateCoolDownStatus(userId, command, false);
                        //console.log(newStatus);
                        msg.channel.send(
                            `**Reminder:** <@${msg.author.id}> your work is ready!`,
                        );
                    }, workCd);
                }
                await work(msg, userId);
                await handleWorkAction(userId, msg);
                await updateComDgStats(userId, 12);
                await updateUserDgStats(userId, 12);
            }

            if (command === "wishlist" || command === "wl") {
                const action = args[0];
                const codes = args.slice(1).filter((code) => code.trim() !== "");
                if (action === undefined) {
                    msg.reply("Please input at least .wl clear, .wl add or .wl set");
                    return;
                }
                if(action === "clear"){
                    await setUserWishList(
                        "Dani-bot-playerbase",
                        userId,
                        "n/a",
                    );
                    msg.reply("Your wishlist has been cleared");
                    return;
                }
                if(action === "add"){
                    const currentWl = await getUserWishList("Dani-bot-playerbase",userId);
                    let newWl = "";
                    if(currentWl[0] === "n/a"){
                        msg.reply("Pleaset set your wishlist with at least one card before trying to add.")
                        return;
                    }
                    if((currentWl.length+codes.length) > 10){
                        msg.reply("Your wl will be over 10 codes. You currently have "+ currentWl.length + " codes in your wishlist");
                    }else{
                        for (let i = 0; i < codes.length; i++) {
                            try {
                                await getCardFromTable("cards", codes[i]);
                            } catch (error) {
                                msg.reply(
                                    "One of your codes is invalid: " +
                                        Discord.inlineCode(codes[i]),
                                );
                                return;
                            }
                        }
                        const newCodes = codes; 
                        const updatedWishlist = currentWl.concat(newCodes);
                        console.log(updatedWishlist);
                        newWl = updatedWishlist.join(", "); 
                        console.log(newWl);
                        await setUserWishList(
                            "Dani-bot-playerbase",
                            userId,
                            newWl,
                        );
                        msg.reply(
                            `You have added the following cards to your wishlist: ${Discord.inlineCode(newCodes)}`,
                        );
                    }
                }
                if(action === "set"){
                    if (codes.length > 10) {
                        msg.reply("**The limit is 10 codes**");
                        return;
                    } else {
                        for (let i = 0 ; i < codes.length; i++) {
                            try {
                                await getCardFromTable("cards", codes[i]);
                            } catch (error) {
                                msg.reply(
                                    "One of your codes is invalid: " +
                                        Discord.inlineCode(codes[i]),
                                );
                                return;
                            }
                        }
                        const codesString = codes.slice(0).join(", ");
                        await setUserWishList(
                            "Dani-bot-playerbase",
                            userId,
                            codesString,
                        );
                        msg.reply(
                            `You have set you wishlist to the following codes: ${Discord.inlineCode(codesString)}`,
                        );
                    }
                }
            }

            if (command === "daily") {
                const dailyCd = Date.now() + 72000 * 1000;
                const remainingCooldown = await getUserCooldown(userId, command);

                if (remainingCooldown !== "0m 0s") {
                    msg.reply(
                        `You must wait ${remainingCooldown} before using this command again.`,
                    );
                    return;
                }
                const cooldownTimestamp = dailyCd;
                const reminderTimestamp = cooldownTimestamp;
                await saveUserCooldown(userId, command, cooldownTimestamp, channel, reminderTimestamp);
                const streak = await getUser(userId);
                const streakNumber = streak["DailyStreak"];
                await setUserStreak(
                    "Dani-bot-playerbase",
                    userId,
                    streakNumber + 1,
                );
                const user = await getUser(userId);
                if (user.Reminders === true) {
                    setTimeout(async () => {
                        const newStatus = await updateCoolDownStatus(userId, command, false);
                        //console.log(newStatus);
                        msg.channel.send(
                            `**Reminder:** <@${msg.author.id}> your daily is ready!`,
                        );
                    }, 72000 * 1000);
                }
                getDaily(msg, userId);
            }

            if (command === "inv" || command === "inventory") {
                let userId;
                let groupName = "";
                let argsCopy = [...args]; // Create a copy of args to modify

                if (argsCopy[0] !== undefined) {
                    const input = argsCopy.join(" ");
                    const quoteMatch = input.match(/["'“‘](.*?)["'”’]/); // Match text within double quotes

                    if (quoteMatch) {
                        groupName = quoteMatch[1].toLowerCase().trim();
                        argsCopy = input
                            .replace(quoteMatch[0], "")
                            .trim()
                            .split(/\s+/); // Remove the quoted group name from args
                    } else {
                        const mentionedIndex = input.indexOf("<@");

                        if (mentionedIndex !== -1) { //checks if theres a mention
                            groupName = input.substring(0, mentionedIndex).trim().toLowerCase(); //if so group names it the rest of the message
                        } else {
                            const potentialUserId = argsCopy[argsCopy.length - 1]; //if not, check if the last argument is a valid user ID
                            if (potentialUserId.match(/^\d{17,19}$/)) {
                                userId = potentialUserId;
                                argsCopy.pop(); 
                                if (argsCopy.length > 0) {
                                    groupName = argsCopy.join(" ").toLowerCase().trim(); // If its valid, the rest of the message is the group name
                                }
                            } else {
                                groupName = argsCopy.join(" ").toLowerCase().trim(); //if no userId, group name is the rest of the message
                            }
                        }
                    }

                    if (msg.mentions.users.size > 0) {
                        userId = msg.mentions.users.first().id;
                    } 
                } else {
                    // no group given
                    if (msg.mentions.users.size > 0) {
                        userId = msg.mentions.users.first().id;
                    } else {
                        userId = argsCopy.join(" ").trim();
                    }
                }

                if (!userId || userId === msg.author.id) {
                    userId = msg.author.id;
                }
                if(groupName === "event"){
                    let eventcards = await getEventCards();
                    //console.log(eventcards);
                    const cardsPerPage = 10;
                    const totalPages = Math.ceil(eventcards.length / cardsPerPage);

                    try {
                        const embedMessage = await msg.channel.send({
                            embeds: [
                                await generateEmbedInvForGroup(0, totalPages, eventcards, msg, userId),
                            ],
                            components: [generateRowInvForGroup(0, totalPages)],
                        });
                        handleCollectorInvForGroup(embedMessage, msg, totalPages, eventcards, userId);
                    } catch (error) {
                        console.log("Error:", error);
                    }
                } else if (groupName === "customs") {
                    let userCustoms = [];
                    try {
                        userCustoms = await getUserCustomCards(userId);
                        //console.log(userCustoms);
                    } catch (error) {
                        console.error("Error getting custom cards:", error);
                        return;
                    }
                    if(userCustoms.length === 0){
                        msg.reply("You have no custom cards");
                        return;
                    }
                    const cardsPerPage = 10;
                    const totalPages = Math.ceil(userCustoms.length / cardsPerPage);

                    try {
                        const embedMessage = await msg.channel.send({
                            embeds: [
                                await generateEmbedInv(0, totalPages, userCustoms, msg, userId),
                            ],
                            components: [generateRowInv(0, totalPages)],
                        });
                        handleCollectorInv(embedMessage, msg, totalPages, userCustoms, userId);
                    } catch (error) {
                        console.log("Error:", error);
                    }
                
                } else if (groupName === "levels") {
                    // Show all leveled cards in user's inventory
                    let leveledCards = [];
    
                    try {
                        leveledCards = await getCardsWithLevels("user-cards", userId);
                        const user = await getUser("1046858875237847162");
                        console.log(user);
                    } catch (error) {
                        console.error("Error getting leveled cards:", error);
                        return;
                    }
    
                    const cardsPerPage = 10;
                    const totalPages = Math.ceil(leveledCards.length / cardsPerPage);
    
                    try {
                        const embedMessage = await msg.channel.send({
                            embeds: [
                                await generateEmbedInv(0, totalPages, leveledCards, msg, userId),
                            ],
                            components: [generateRowInv(0, totalPages)],
                        });
                        handleCollectorInv(embedMessage, msg, totalPages, leveledCards, userId);
                    } catch (error) {
                        console.log("Error:", error);
                    }
                } else {
                    let uniqueGroupNames = [];
                    try {
                        uniqueGroupNames = await getUniqueGroupNames("cards");
                    } catch (error) {
                        console.error("Error fetching unique group names:", error);
                        return;
                    }
    
                    if (groupName) { // only if there is a group name (everythign else bellow only applies if not matched above)
                        const namesToLowerCase = uniqueGroupNames.map((name) => name.toLowerCase());
                        const nameIndex = namesToLowerCase.indexOf(groupName);
    
                        if (nameIndex === -1) {
                            msg.reply("The specified group name does not exist. Ensure spelling is correct.");
                            return;
                        }
    
                        const originalGroupName = uniqueGroupNames[nameIndex];
                        let filteredCards = [];
    
                        try {
                            filteredCards = await filterByAttribute("cards", "GroupName", originalGroupName);
                            filteredCards = filteredCards.filter((card) => card.cardRarity === 1);
                        } catch (error) {
                            console.error("Error filtering cards by group name:", error);
                            return;
                        }
    
                        const cardsPerPage = 10;
                        const totalPages = Math.ceil(filteredCards.length / cardsPerPage);
    
                        try {
                            const embedMessage = await msg.channel.send({
                                embeds: [
                                    await generateEmbedInvForGroup(0, totalPages, filteredCards, msg, userId),
                                ],
                                components: [generateRowInvForGroup(0, totalPages)],
                            });
                            handleCollectorInvForGroup(embedMessage, msg, totalPages, filteredCards, userId);
                        } catch (error) {
                            console.log("Error:", error);
                        }
                    } else { // default if there's no groupName
                        let listOfCards = [];
    
                        try {
                            listOfCards = await getUserCards("user-cards", userId);
                            const user = await getUser(userId);
                        } catch (error) {
                            console.log("Error getting user cards:", error);
                            return;
                        }
    
                        const cardsPerPage = 10;
                        const totalPages = Math.ceil(listOfCards.length / cardsPerPage);
    
                        try {
                            const embedMessage = await msg.channel.send({
                                embeds: [
                                    await generateEmbedInv(0, totalPages, listOfCards, msg, userId),
                                ],
                                components: [generateRowInv(0, totalPages)],
                            });
                            handleCollectorInv(embedMessage, msg, totalPages, listOfCards, userId);
                        } catch (error) {
                            console.log("Error:", error);
                        }
                    }
                }
            }

            if (command === "feed") {
                const input = args.filter((code) => code.trim() !== "");
                let cardId = input[0];
                let numberOfCards = input[1];
                let groupToFeed = ' ';
                if(input[0] === "all"){
                    try {
                        groupToFeed = args.slice(1).join(" ").toLowerCase().trim();
                        let uniqueGroupNames = [];
                        try {
                            uniqueGroupNames = await getUniqueGroupNames("cards");
                        } catch (error) {
                            console.error(
                                "Error fetching unique group names:",
                                error,
                            );
                        }
                        const namesToLowerCase = uniqueGroupNames.map((name) =>
                            name.toLowerCase(),
                        );

                        const nameIndex = namesToLowerCase.indexOf(groupToFeed);
                        if (nameIndex === -1) {
                            msg.reply(
                                "The specified group name does not exist. Ensure spelling is correct.",
                            );
                            return;
                        }
                        const originalGroupName = uniqueGroupNames[nameIndex];
                        msg.reply(`You are feeding all cards from ${originalGroupName} (cards that will reach level 20/are level 20 will be skipped)`);
                        try {
                            console.log("Trying to filter cards for group feed");
                            filteredCards = await filterByAttribute("cards", "GroupName", originalGroupName);
                            filteredCards = filteredCards.filter((card) => card.cardRarity === 1);
                            console.log("Filtered cards for group feed");
                        } catch (error) {
                            console.error("Error filtering cards by group name:", error);
                            return;
                        }
                        try{
                            console.log("Trying to send embed");
                            const embed = await groupFeed(userId, filteredCards);
                            msg.channel.send({ embeds: [embed] });
                            console.log("Embed sent");
                        }catch(error){
                            console.log("Something went wrong with group feed");
                        }
                    }catch(error){
                        console.log("No valid group name provided");
                    }
                    return;
                }
                if(cardId === "fc" || cardId === "FC" || cardId === "fC"|| cardId === "Fc"){
                    const user = await getUser(userId);
                    console.log(user);
                    cardId = user["FavCard"];
                }
                try{
                    await getCardFromTable("cards", cardId);
                }catch(error){
                    msg.reply("**This is not a valid card id.**");
                    console.log("Error getting item from table: ", error);
                    return;
                }
                if(numberOfCards === "all"){
                    const all = await getHowManyCopiesOwned("user-cards", userId, cardId);
                    numberOfCards = all - 1;
                    console.log("Number owned: ", numberOfCards)
                }else{
                    if (isNaN(numberOfCards) || args.length < 2) {
                        numberOfCards = 1;
                    }
                    if (isNaN(numberOfCards) || numberOfCards === undefined) {
                        msg.reply("Please ensure you have entered a valid number.");
                        return;
                    }
                }
                const temp = await awardExp(
                    userId,
                    String(cardId),
                    numberOfCards,
                    msg,
                    "single",
                );
                /*const amountOwnedBefore = await getHowManyCopiesOwned(
                    "user-cards",
                    userId,
                    cardId,
                );
                const newAmountOwned = amountOwnedBefore - numberOfCards;*/

                if (temp === 0) {
                    msg.reply("**You do not own this card**");
                    return;
                }
                if (temp === 1) {
                    msg.reply("**You do not own enough copies**");
                    return;
                }
                if (temp === 2) {
                    msg.reply("**Your card is already at max level!**");
                    return;
                }
            }

            if (command === "upgrade" || command === "u") {
                const input = args.filter((code) => code.trim() !== "");
                const code = input[0];
                const status = await upgrade(userId, code, msg);
                if (status === true) {
                    return;
                } else if (status === false) {
                    msg.reply("Your card is too low level to upgrade");
                    return;
                }
            }

            if (command === "help") {
                if(args.length === 0){
                    const embed = helpCommand(0);
                    const pages = 4;
                    const components = pages > 1 ? [generateRowHelp(0, pages)] : [];

                    msg.reply({ embeds: [embed], components: components })
                        .then((sentMsg) => {
                            handleCollectorHelp(sentMsg, msg);
                        })
                        .catch(console.error); 
                }else {
                    const specificCommand = args[0];
                    const embed = specificHelpCommand(specificCommand);
                    msg.reply({ embeds: [embed] });
                }
            }

            if (command === "remindersoff") {
                const userId = msg.author.id;
                await setAutoReminders("Dani-bot-playerbase", userId, false);

                const embed = new EmbedBuilder()
                    .setColor("#d81159")
                    .setTitle("Auto Reminders Turned Off")
                    .setDescription(
                        `You will no longer receive reminders for claims, drops, work and daily.`,
                    )
                    .setTimestamp();

                msg.channel.send({ embeds: [embed] });
            }

            if (command === "reminderson") {
                const userId = msg.author.id;
                await setAutoReminders("Dani-bot-playerbase", userId, true);

                const embed = new EmbedBuilder()
                    .setColor("#04a777")
                    .setTitle("Auto Reminders Turned On")
                    .setDescription(
                        `You will now receive reminders for claims, drops, work and daily.`,
                    )
                    .setTimestamp();

                msg.channel.send({ embeds: [embed] });
            }

            if (command === "dg" || command === "dungeon") {
                const command = "dungeon";
                const dgCd = Date.now() + 14400 * 1000; //
                const remainingCooldown = await getUserCooldown(userId, command);

                const input = args.filter((code) => code.trim() !== "");
                let code = input[0];
                const dgToEnter = input[1];
                if (code === "1") {
                    msg.reply(
                        `Challange the boss JYP to recieve 0-1 cards of your chosen card and between 5000- 7000 ${currencyEmote} on win!`,
                    );
                    return;
                }
                if (code === "2") {
                    msg.reply(
                        `Challange the boss SM to recieve 1-2 cards of your chosen card and between 7500 - 10000 ${currencyEmote} on win!`,
                    );
                    return;
                }
                if (code === "3") {
                    msg.reply(
                        `Challange the boss SM to recieve 2-3 cards of your chosen card and between 10000 - 15000 ${currencyEmote} on win!`,
                    );
                    return;
                }
                if (code === "fc"){
                     user = await getUser(userId);
                     code = user["FavCard"];
                }
                try {
                    await getCardFromTable("cards", code);
                } catch (error) {
                    msg.reply("Please input a valid card id");
                    console.log("Error:", error);
                    return;
                }

                if (!dgToEnter) {
                    try {
                        const card = await getCardFromTable("cards", code);
                        const userOwns = await checkIfUserOwnsCard(
                            "user-cards",
                            userId,
                            code,
                        );
                        if (userOwns === 0) {
                            msg.reply("You do not own this card");
                            return;
                        }
                        msg.reply(
                            "You are viewing the win rates for: " +
                                Discord.inlineCode(code) +
                                ". To enter a dg please input a code and either a value of 1,2,3",
                        );
                        const cardId = card["card-id"];
                        const embed = await dgWinRates(msg, userId, cardId);
                        msg.channel.send({ embeds: [embed] });
                    } catch (error) {
                        console.log(error);
                        msg.reply("Please input a valid card id");
                        return;
                    }
                } else {
                    const userOwns = await checkIfUserOwnsCard(
                        "user-cards",
                        userId,
                        code,
                    );
                    if (userOwns === 0) {
                        msg.reply("You do not own this card");
                        return;
                    }
                    if (remainingCooldown !== "0m 0s") {
                        msg.reply(
                            `You must wait ${remainingCooldown} before using this command again.`,
                        );
                        return;
                    }
                    console.log(dgToEnter);
                    if(isNaN(dgToEnter) || dgToEnter === undefined || ![1, 2, 3].includes(parseInt(dgToEnter))) {
                        msg.reply(
                            `Please input a valid dg number to enter.`,
                        );
                        return;
                    }
                    await enterDg(msg, userId, code, dgToEnter);
                    const cooldownTimestamp = dgCd;
                    const reminderTimestamp = cooldownTimestamp;
                    await saveUserCooldown(userId, command, cooldownTimestamp, channel, reminderTimestamp);
                    const user = await getUser(userId);
                    if (user.Reminders === true) {
                        setTimeout(async () => {
                            const newStatus = await updateCoolDownStatus(userId, command, false);
                            //console.log(newStatus);
                            msg.channel.send(
                                `**Reminder:** <@${msg.author.id}> your dungeon is ready!`,
                            );
                        }, 14400 * 1000);
                    }
                }
            }

            if(command === "shop" || command === "s"){
                const userBal = await getUsersBalance(userId);
                if ((args[0] === 'buy' || args[0] === 'b') && args[1] === "1") {
                    const itemId = "5_pack";
                    if(userBal < 10000){
                        msg.reply("You do not have enough to purchase this item. Current balance: " + Discord.bold(userBal));
                    }else{
                        purchaseItem(msg, itemId, userId);
                        await saveUserBalance(userId, (userBal - 10000))
                    }
                } 
                if ((args[0] === 'buy' || args[0] === 'b') && args[1] === "2") {
                    const itemId = "AlbumToken";
                    if(userBal < 20000){
                        msg.reply("You do not have enough to purchase this item. Current balance: " + Discord.bold(userBal));
                    }else{
                        purchaseItem(msg, itemId, userId);
                        await saveUserBalance(userId, (userBal - 20000))
                    }
                }
                if(args[0] === undefined){
                    openShop(msg);
                }
            }
            
            if(command === "packs"){
                try {
                    let packs = await getPacks(userId);
                    if(packs === undefined){
                        packs = 0;
                    }
                    const embed = new EmbedBuilder()
                        .setColor('#779be7')
                        .setTitle('Do .pack open to open a pack')
                        .setDescription(`You have ${packs} packs.`)
                        .setTimestamp();
                    await msg.channel.send({ embeds: [embed] });
                } catch (err) {
                    console.error('Failed to retrieve packs:', err);
                    msg.reply('Failed to retrieve packs. Please try again later.'); // Error message to user
                }
            }
            
            if(command === "pack"){
                const args = msg.content.toLowerCase().split(/ +/);
                const command = args[1];
                if(command === "open"){
                    const command = "packOpen";
                    const packOpenCd = 5 * 1000; // 300 seconds
                    const remainingCooldown = await getUserCooldown(userId, command);
                    if (remainingCooldown !== "0m 0s") {
                        msg.reply(
                            `You must wait ${remainingCooldown} before trying to open a pack.`,
                        );
                        return;
                    }
                    const cooldownTimestamp = Date.now() + packOpenCd;
                    await saveUserCooldown(userId, command, cooldownTimestamp);
                    const packNumber = await getPacks(userId);
                    if(packNumber === 0){
                        msg.reply("You do not have any packs");
                        return;
                    }
                    if(packNumber < 0){
                        msg.reply("You have a negative number of packs, please report to bugs!");
                        return;
                    }
                    await packOpen(msg, userId); 
                    await removePack(userId);
                }
            }
            
            if(command === "leaderboard" || command === "lb"){
                const leaderboardType = args.filter((code) => code.trim() !== "");
                await displayLeaderboard(msg, leaderboardType[0], client);
            }

            if(command === "community" || command === "com"){
                const joinedArgs = args.join(' ');
                // Use a regular expression to split by spaces except those inside quotes
                if(joinedArgs.length === 0){
                    const input = undefined;
                    await sortCommunityOut(msg, input, userId);
                }else{
                    const input = joinedArgs.match(/(?:[^\s"]+|"[^"]*")+/g).map(arg => arg.replace(/"/g, ''));

                    await sortCommunityOut(msg, input, userId);
                }
            }

            if(command === "quests" || command === "q"){
                await setUserQuests(userId);
                const userQuests = await getUserQuests(userId);
                const embed = await createQuestEmbed(userQuests, msg);
                msg.channel.send({ embeds: [embed] });
                
            }

            if(command === "album"){
                if(args[0] === 'create'){
                    const albumTokens = await getAlbumTokens(userId);
                    if(albumTokens === 0){
                        msg.reply("You do not have any album tokens. Do .s b 2 to buy one.")
                        return;
                    }
                    const albumName = args.slice(1).join(' ');
                    const created = await createAlbum(userId, albumName);
                    if(created === false){
                        msg.reply("You already have a album with that name");
                        return;
                    }else{
                        msg.reply("Album created with name: " + albumName);
                        await removeAlbumToken(userId);
                        return;
                    }
                }
                if(args[0] === "delete"){
                    const albumName = args.slice(1).join(' ');
                    const deleted = await deleteAlbum(userId, albumName);
                    if(deleted === false){
                        msg.reply("Issue deleting album. Check you have an album with this name.");
                        return;
                    }else{
                        msg.reply("Album with name: " + albumName + " deleted");
                        return;
                    }
                }
                if(args[0] === "list"){
                    try {
                        const albumNames = await getAlbums(userId);
                        if (albumNames.length === 0) {
                            msg.channel.send('You have no albums.');
                            return;
                        }
                        const embed = new EmbedBuilder()
                            .setTitle('Your Albums')
                            .setDescription(Discord.inlineCode(albumNames.join('\n')))
                            .setColor('#a2d2ff');

                        msg.channel.send({ embeds: [embed] });
                    } catch (error) {
                        console.error('Error sending user albums embed:', error);
                        msg.channel.send('An error occurred while fetching your albums.');
                    }

                }
                if(args[0] === "view"){
                    const albumName = args.slice(1).join(' ');
                    try{
                        await getAlbum(userId, albumName);
                    }catch(error){
                        msg.reply("You do not have an album with that name");
                        return;
                    }
                    const buffer = await generateAlbumImage(userId, albumName, msg);
                    const embed = new EmbedBuilder()
                        .setTitle(`Viewing album: ${Discord.inlineCode(albumName)}`)
                        .setImage(`attachment://album.png`);

                    msg.channel.send({ embeds: [embed], files: [{ attachment: buffer, name: 'album.png' }] });
                }
                if(args[0] === "add"){
                    const albumName = args[1];
                    const cardId = args[2];
                    const position = parseInt(args[3]);
                    try{
                        await getAlbum(userId, albumName);
                    }catch(error){
                        msg.reply("You do not have an album with that name");
                    }
                    try {
                        await getCardFromTable("cards", cardId);
                    } catch (error) {
                        msg.reply("Please input a valid card id");
                        console.log("Error:", error);
                        return;
                    }
                    if(position < 1 || position > 8 || isNaN(position)){
                        msg.reply("Give a number between 1 and 8");
                        return;
                    }
                    try{
                        const userOwns = await checkIfUserOwnsCard("user-cards", userId, cardId);
                        console.log(userOwns);
                        if(parseInt(userOwns) === 0){
                            msg.reply("You must have at least one copy to add to an album");
                            return;
                        }else{
                           await addCardToAlbum(userId, albumName, cardId, position);
                           msg.reply(`Card ${Discord.inlineCode(cardId)} added to ${Discord.inlineCode(albumName)} at position ${Discord.inlineCode(position)}`);
                        }
                    }catch(error){
                        msg.reply("Something went wrong adding card to album", albumName + ". Check you own an album with this name.");
                        console.log(error);
                    }

                }
                if(args[0] === "remove"){
                    const albumName = args[1];
                    const position = parseInt(args[2]);
                    if(position < 1 || position > 8 || isNaN(position)){
                        msg.reply("Give a number between 1 and 8");
                        return;
                    }
                    try{
                        const removed = await removeCard(userId, albumName, position);
                        if(removed === false){
                            msg.reply("No card at this position.")
                            return;
                        }
                        msg.reply("You have removed the card at position " + Discord.inlineCode(String(position)) + " from the album " + Discord.inlineCode(albumName));
                    }catch(error){
                        msg.reply("Something went wrong removing card from album" + albumName);
                        console.log(error);
                    }
                }
                /*if(args[0] === "replace"){
                    const albumName = args[1];
                    const cardId = args[2];
                    const position = parseInt(args[3]);
                    if(position < 1 || position > 8 || isNaN(position)){
                        msg.reply("Give a number between 1 and 8");
                        return;
                    }
                    try {
                        await getCardFromTable("cards", cardId);
                    } catch (error) {
                        msg.reply("Please input a valid card id");
                        console.log("Error:", error);
                        return;
                    }
                    try{
                        await replaceCard(userId, albumName, cardId, position);
                    }catch(error){
                        msg.reply("Something went wrong replacing card from album" + albumName);
                        console.log(error);
                    }
                }*/
            }

            if (command === "achievements") {
                let userAchievements = await checkUserInTable(userId);
                const { embed, totalPages } = achievementsCommand(userAchievements, 0);
                const components = totalPages > 1 ? [generateRowAchievements(0, totalPages)] : [];

                msg.reply({ embeds: [embed], components: components })
                    .then((sentMsg) => {
                        handleCollectorAchievements(sentMsg, msg, userAchievements, totalPages);
                    })
                    .catch(console.error); // Catch errors for debugging        
            }

            /*if(command === "eventroll" || command === "er"){
                const rolls = await getEventRolls(userId);
                console.log(rolls);
                if(rolls < 2){
                    msg.reply("You don't have enough event rolls (need minimum 2)");
                    return;
                }
                await initiateEventRoll(userId, msg);
                //await eventRoll(userId, msg);
            }*/

            if(command === "gts"){
                const input = args.filter((code) => code.trim() !== "");
                if (args[0] === undefined) {
                    const { embeds, components, totalPages, data } = await globalTradeStationEmbed();
                    const embedMessage = await msg.channel.send({ embeds, components });
                    handleCollectorGts(embedMessage, msg, totalPages, data); // Handle pagination interactions
                    return;
                }
                if (input[0] === "mine") {
                    const { embeds, components, totalPages, data } = await userGlobalTradeStationEmbed(userId);
                    const embedMessage = await msg.channel.send({ embeds, components });
                    handleCollectorGts(embedMessage, msg, totalPages, data); // Handle pagination interactions
                    return;
                }
                if(input[0] === "id"){
                    const cardId = input[1];
                    try{
                        await getCardFromTable("cards", cardId);
                    }catch(error){
                        msg.reply("Please input a valid card id");
                        return;
                    }
                    const filteredTrades = await filterTrades(cardId);
                    console.log(filteredTrades);
                    const { embeds, components, totalPages, data } = await filteredTradeEmbed(filteredTrades);
                    const embedMessage = await msg.channel.send({ embeds, components });
                    handleCollectorGts(embedMessage, msg, totalPages, data);
                    return;
                }
                if(input[0] === "delete"){
                     const tradeId = input[1];
                     const trade = await getTradeByGlobalTradeId(tradeId);
                     if(trade.length === 0){
                         msg.reply("Ensure you have entered a valid trade id");
                         return;
                     }
                    if(trade[0]["user-id"] != userId){
                        msg.reply("This is not a trade you own. You can only delete your own trades");
                        return;
                    }
                    try{
                        const userId = msg.author.id; 
                        const cardUft = trade[0]["cardUft"];
                        const cardCount = await getHowManyCopiesOwned("user-cards", userId, cardUft);
                        await deleteTradeByGlobalTradeId(trade[0]["globalTradeId"]);
                        await addToUserInv(userId, cardUft, cardCount);
                        const embed = new EmbedBuilder().setColor("#b9375e").setTitle(`Trade with ID ${Discord.inlineCode(trade[0]["globalTradeId"])} deleted!`).setTimestamp();
                        msg.reply({ embeds: [embed] });
                    }catch(error){
                        console.log("Issue adding card to users inv")
                        console.log(error);
                    }
                }
                if(input[0] === "create"){
                    const cardUft = input[1];
                    const cardLf = input[2];
                    if(cardUft === cardLf){
                        msg.reply("You cannot have your uft card be the same as your lf card");
                        return;
                    }
                    try {
                        await getCardFromTable("cards", cardUft);
                        await getCardFromTable("cards", cardLf);
                    } catch (error) {
                        msg.reply("Please ensure both are valid card ids");
                        console.log("Error:", error);
                        return;
                    }
                    const userId = msg.author.id; 
                    const cardCount = await getHowManyCopiesOwned("user-cards", userId, cardUft);
                    if(cardCount === 0 || cardCount === 1){
                        msg.reply("You do not own enough copies of this card to add this trade to the gts");
                        return;
                    }
                    const userGTS =  await getUserGTS(userId);
                    const missingIds = getMissingIds(userGTS);
                    if(userGTS.length === 10){
                        msg.reply("You have reached the max number of entries");
                        return;
                    }
                    const tradeId = missingIds[0].toString();
                    const timestamp = Date.now();
                    await addToGTS(userId, tradeId, cardUft, cardLf, timestamp);
                    try{
                        await removeFromUserInv(userId, cardUft, cardCount);
                    }catch(error){
                        console.log("Issue removing card from users inv");
                        console.log(error);
                    }
                    const embed = new EmbedBuilder().setColor("#93e1d8").setTitle("Trade created!").setTimestamp();
                    msg.reply({ embeds: [embed] });
                }else{
                    if(input[0] === "trade"){
                         const trade = await getTradeByGlobalTradeId(input[1]);
                         const tradeData = trade[0];
                         console.log(trade);
                         if(trade.length === 0){
                             msg.reply("Ensure you have entered a valid trade id");
                             return;
                         }
                         const userOwnsEnough = await getHowManyCopiesOwned("user-cards", msg.author.id, tradeData["cardLf"]);
                         if(userOwnsEnough <= 1){
                             msg.reply("You must own at least 1 duplicate to make this trade");
                             return;
                         }
                         console.log(tradeData);
                         const user1owns = await getHowManyCopiesOwned("user-cards", tradeData["user-id"], tradeData["cardLf"]);
                         let item = {};
                         if(user1owns === 0){
                             item = {
                                 "user-id": tradeData["user-id"], // primary key
                                 "card-id": tradeData["cardLf"], // secondary key
                                 exp: 0,
                                 level: 0,
                                 upgradable: false,
                                 "copies-owned": 1,
                                 tier: 1,
                                 totalExp: 0
                             };
                             await writeToDynamoDB("user-cards", item);
                         }else{
                              await addToUserInv(tradeData["user-id"], tradeData["cardLf"], user1owns);
                         }
                         console.log(user1owns);
                         const user2owns = await getHowManyCopiesOwned("user-cards", msg.author.id, tradeData["cardUft"]);
                         console.log(user2owns);
                         await addToUserInv(msg.author.id, tradeData["cardUft"], user2owns);
                         await removeFromUserInv(msg.author.id, tradeData["cardLf"], userOwnsEnough);
                         await deleteTradeByGlobalTradeId(trade[0]["globalTradeId"]);
                         const embed = new Discord.EmbedBuilder()
                            .setTitle("Trade recieved!")
                            .setColor("#93e1d8")
                            .addFields(
                                { name: " ", value: `You have gotten: ${Discord.inlineCode(tradeData["cardLf"])}  from a trade!`, inline: false },
                                {
                                    name: "Trade ID:",
                                    value: tradeData["globalTradeId"],
                                    inline: false,
                                },
                                { name: " ", value: `Card traded off: ${Discord.inlineCode(tradeData["cardUft"])}`, inline: false },
                            )
                            .setTimestamp();
                        try {
                            const user = await client.users.fetch(tradeData["user-id"]); bot
                            if (!user.dmChannel) {
                                await user.createDM();
                            }

                            // If the DM channel is successfully created or already exists, send the message
                            await user.send({ embeds: [embed] });
                        } catch (error) {
                            if (error.code === 50007) {
                                console.error(`Cannot send messages to this user: ${message.author.tag}`);
                                // Optionally notify the server or perform another action
                            } else {
                                console.error('An unknown error occurred:', error);
                            }
                        }

                         const secondEmbed = new Discord.EmbedBuilder()
                            .setTitle("Trade recieved!")
                            .setColor("#93e1d8")
                            .addFields(
                                { name: " ", value: `You have gotten: ${Discord.inlineCode(tradeData["cardUft"])}  from a trade!`, inline: false },
                                {
                                    name: "Trade ID:",
                                    value: tradeData["globalTradeId"],
                                    inline: false,
                                },
                                { name: " ", value: `Card traded off: ${Discord.inlineCode(tradeData["cardLf"])}`, inline: false },
                            )
                            .setTimestamp();
                        try {
                            const user2 = await client.users.fetch(msg.author.id);

                            if (!user2.dmChannel) {
                                await user2.createDM();
                            }

                            // If the DM channel is successfully created or already exists, send the message
                            await user2.send({ embeds: [secondEmbed] });
                            msg.reply("**Trade successful!**");
                        } catch (error) {
                            if (error.code === 50007) {
                                console.error(`Cannot send messages to this user: ${msg.author.tag}`);
                                // Optionally notify the server or perform another action
                            } else {
                                console.error('An unknown error occurred:', error);
                            }
                            // Reply to the message in case of error
                            msg.reply("**Trade successful, but unable to send direct message!**");
                        }
                        //add copies to each user opf the card they wanted
                        //make sure to remove the lf copy from this user too
                    }
                }
            }

            if (command === "forcedrop") {
                const REQUIRED_ROLE_NAME = "mod";
                const role = msg.guild.roles.cache.find(
                    (role) => role.name === REQUIRED_ROLE_NAME,
                );
                if (role && msg.member.roles.cache.has(role.id)) {
                    const args = msg.content.split(' ');
                    if (args.length > 1) {
                        let userId = args[1];
                        if (userId.startsWith('<@') && userId.endsWith('>')) {
                            userId = userId.slice(2, -1); // Remove <@ and >
                            if (userId.startsWith('!')) {
                                userId = userId.slice(1); // Remove ! if it exists
                            }
                        }
                        if (userId) {
                            getClaim(msg, userId); //maybe change in future idk works for now
                        } else {
                            msg.reply("Please provide a valid user ID or mention.");
                        }
                    } else {
                        msg.reply("Please provide a user ID or mention.");
                    }
                } else {
                    msg.reply("You do not have the required role to use this command.");
                }
            }

            if (command === "modify") {
                let user = " ";
                const REQUIRED_ROLE_NAME = "mod";
                let amount = 0;
                const role = msg.guild.roles.cache.find(
                    (role) => role.name === REQUIRED_ROLE_NAME,
                );
                if (role && msg.member.roles.cache.has(role.id)) {
                    if (msg.mentions.users.size > 0) {
                        user = msg.mentions.users.first().id;
                    } else {
                        if (args[0] != undefined) {
                            user = String(args[0]).trim();
                            const userExists = await checkUserExists(user);
                            if (!userExists) {
                                msg.reply("User does not exist in database");
                                return;
                            }
                        } else {
                            msg.reply("Please provide a valid user ID.");
                            return;
                        }
                    }
                    if (args.length >= 1) {
                        if ((args[1] != undefined)) {
                            const amountStr = String(args[1]).trim();
                            if (!amountStr || isNaN(amountStr)) {
                                msg.reply("Please provide a valid amount.");
                                return;
                            } else {
                                amount = parseFloat(amountStr);
                            }
                        } else {
                            msg.reply("Please provide a valid amount.");
                        }
                    }
                    try {
                        const currentBal = await getUsersBalance(user);
                        saveUserBalance(user, (parseInt(currentBal) + amount));

                        const embed = new Discord.EmbedBuilder()
                            .setTitle("Balance Modified")
                            .setColor("#04a777")
                            .addFields(
                                { name: "User ID", value: user, inline: true },
                                {
                                    name: "Amount",
                                    value: amount.toString(),
                                    inline: true,
                                },
                            )
                            .setTimestamp();
                        msg.channel.send({ embeds: [embed] });
                    } catch (error) {
                        console.log(error);
                        msg.reply("An error occurred while modifying the balance.");
                    }
                } else {
                    return;
                }
            }

            if(command === "giftcard"){
                let user = " ";
                const REQUIRED_ROLE_NAME = "mod";
                const cardIDToGift = args[1];
                const amount = args[2];
                const role = msg.guild.roles.cache.find(
                    (role) => role.name === REQUIRED_ROLE_NAME,
                );
                 if (role && msg.member.roles.cache.has(role.id)) {
                    const targetUser = msg.mentions.users.first();
                     try{
                         if(!targetUser){
                             msg.reply("Please mention a user.")
                             return;
                         }
                         if(args[2] === undefined || args[2] <= 0){
                             msg.reply("Please provide a valid number to gift");
                             return;
                         }
                         await modGiftCard(targetUser, cardIDToGift, msg, parseInt(amount));
                     }catch(error){
                         msg.reply("Issue gifting card to user.");
                         console.log("Error: ", error);
                     }
                 }
            }
            
            if (command === "createraffle") {
                const REQUIRED_ROLE_NAME = "mod"; //change back to admin
                const role = msg.guild.roles.cache.find(
                    (role) => role.name === REQUIRED_ROLE_NAME,
                );
                if (role && msg.member.roles.cache.has(role.id)) {
                    sendRaffleEmbed();
                } else {
                    return;
                }
            } 
            
            if(command === "toggleraffle"){
                const REQUIRED_ROLE_NAME = "mod"; 
                const role = msg.guild.roles.cache.find(
                    (role) => role.name === REQUIRED_ROLE_NAME,
                );
                if (role && msg.member.roles.cache.has(role.id)) {
                    const raffleRewards = await changeRaffleRewards();
                    msg.channel.send(`Double raffle rewards toggled to: **${raffleRewards}**`);
                } else {
                    return;
                }
            }

            if(command === "togglequests"){
                const REQUIRED_ROLE_NAME = "mod"; 
                const role = msg.guild.roles.cache.find(
                    (role) => role.name === REQUIRED_ROLE_NAME,
                );
                if (role && msg.member.roles.cache.has(role.id)) {
                    const questRewards = await changeQuestRwards();
                    msg.channel.send(`Double quest rewards toggled to: **${questRewards}**`);
                } else {
                    return;
                }
            }
        }catch(error){
             console.error("An unexpected error occurred:", error);
        }

    }
});


function hasRole(member, roleName) {
    return member.roles.cache.some(role => role.name === roleName);
}
async function sendRaffleEmbed() {
    const ROLE_ID = '1256328712086098040';
    const channel = client.channels.cache.get('1256331822812500068');
    const role = channel.guild.roles.cache.get(ROLE_ID);
    channel.send(`<@&${ROLE_ID}>`);
    
    if (!channel) return;
    await forceRaffle(channel, client);
}

client.login(process.env.Token);

