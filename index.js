require("dotenv").config();
const prefix = ".";
const Discord = require("discord.js");
const AWS = require("aws-sdk");
AWS.config.update({
    accessKeyId: process.env["Access_key"],
    secretAccessKey: process.env["Secret_access_key"],
    region: "eu-west-2",
});
const{work} = require("./work");
const {getCooldowns} = require("./cooldowncommand.js");
const {giftcards} = require("./gift.js");
const {awardExp} = require("./cardExpSystem.js");
const {saveUserData,checkUserExists,checkUserDisabled,setUserCard,setUserBio,setUserWishList, getUserCards, getUser} = require("./users.js");
const {saveUserCooldown,getUserCooldown} = require("./cooldowns");
const {getHowManyCopiesOwned,getCardFromTable,getTotalCards} = require("./cards");
const {getUserProfile} = require("./profile.js");
const {generateEmbedInv, generateRowInv, handleCollectorInv } = require("./inventory.js");
const {generateEmbed, generateRow, handleCollector } = require("./indexButtons.js");
const {getUsersBalance} = require("./userBalanceCmds");
const {getClaim} = require("./claim.js");
const {getDrop} = require("./drop.js");
const {getDaily} = require("./daily.js");
const {GatewayIntentBits} = require("discord.js");
const {payCommand} = require("./pay.js");
const {setUserStreak} = require("./updateDailyStreak.js")
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
    if (msg.content.startsWith(prefix)) {
        const args = msg.content.slice(prefix.length).trim().split(" ");
        const command = args.shift().toLowerCase();
        const userId = msg.author.id;
        const authorTag = `${msg.author.username}#${msg.author.discriminator}`;
        const userExists = await checkUserExists(userId);
        const generalCmdCd = Date.now() + 3 * 1000;
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
                    .setColor(0x0099ff)
                    .setTitle(
                        "**Welcome to Danielle Bot **" + authorTag + "**!**",
                    )
                    .setDescription(
                        "**Enjoy your stay <:daniheart:1251995500308336723> You have been given 10,000 coins as a welcome gift!**",
                    ) // add an amount of currency here and add it to the users balance after they start
                    .setImage(
                        "https://media.discordapp.net/attachments/863906210582626335/1252011345168175225/newjeans-danielle-omg-4k-wallpaper-uhdpaper.com-2350i.jpg?ex=6670a9ed&is=666f586d&hm=985b63d3eb9d63aa6a86c8479f85e6a1d8aa61d47e5329d011978f35ab3e67a1&=&format=webp&width=1177&height=662",
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
                msg.channel.send(`**You are already registered!**`);
                return;
            }
        }

        if (command === "profile" || command === "p") {
            await getUserProfile(msg, userId);
        }

        if (command === "c") {
            const claimCd = Date.now() + 300 * 1000;
            const remainingCooldown = await getUserCooldown(userId, command);

            if (remainingCooldown !== '0m 0s') {
                msg.reply(`You must wait ${remainingCooldown} before using this command again.`);
                return;
            }
            const cooldownTimestamp = claimCd;
            await saveUserCooldown(userId, command, cooldownTimestamp);
            getClaim(msg,userId);
        } 

        if (command === "d") {
            const dropCd = Date.now() + 600 * 1000;
            const remainingCooldown = await getUserCooldown(userId, command);

            if (remainingCooldown !== '0m 0s') {
                msg.reply(`You must wait ${remainingCooldown} before using this command again.`);
                return;
            }
            const cooldownTimestamp = dropCd;
            await saveUserCooldown(userId, command, cooldownTimestamp);
            getDrop(msg,userId);
        }

        if (command === "bal") {
            const userBal = await getUsersBalance(userId);
            if (userBal === null) {
                const noBalanceEmbed = new EmbedBuilder()
                    .setColor("#ee9090")
                    .setTitle(`${msg.author.username}'s Balance`)
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
                .setTitle(`${msg.author.username}'s Balance`)
                .setDescription(
                    "**Balance: **" + Discord.inlineCode(`${balWithCommas}`),
                )
                .setTimestamp();
            msg.channel.send({ embeds: [balanceEmbed] });
        }

        if (command === "pay") {
            const amount = parseFloat(args[1]);
            if ((amount < 0) | !Number.isInteger(amount)) {
                msg.channel.send(
                    "**You are not allowed to steal monies bad oddy**",
                );
                return;
              }
          let targetUser = msg.mentions.users.first();
          if (targetUser === msg.author) {
            msg.channel.send("** Trying to give yourself money? **");
            return;
          }
          if (targetUser === undefined) {
            msg.channel.send("Please mention a user.");
            return;
          }
          if (isNaN(amount)) {
            msg.channel.send("Please provide a valid amount!");
            return;
          }
         await payCommand(msg, userId, targetUser, amount);
        }

        if (command === "cd") {
            await getCooldowns(userId, msg);
        }

        if (command === "index") {
            const listOfCards = await getTotalCards("cards");
            const cardsPerPage = 4;
            const totalPages = Math.ceil(listOfCards.Items.length / cardsPerPage);

            const embedMessage = await msg.channel.send({ embeds: [generateEmbed(0, totalPages, listOfCards, msg)], components: [generateRow(0, totalPages)] });

            handleCollector(embedMessage, msg, totalPages, listOfCards);
        }

        if (command === "view" || command === "v") {
            //get second parameter entered by the user and parse that as the cardid to get from table
            const cardId = args[0];
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
                    //get current exp and level
                    const embed = new EmbedBuilder() //embed that shows the group name, member name, card id and card url
                        .setColor("#feb69e")
                        .setDescription(
                            `You are viewing **${cardToView["GroupName"]} ${cardToView["GroupMember"]}**`,
                        )
                        .setImage(cardToView["cardUrl"]) // changed depending on the card recieved
                        .addFields({
                            name: "You Own: ",
                            value: Discord.inlineCode(String(numberOfCopies)),
                            inline: true,
                        })
                        .setFooter({
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
            if (msg.mentions.users.first() == undefined) {
                msg.channel.send("Please mention a user.");
                return;
            }
            let targetUser = msg.mentions.users.first();
            if (targetUser.id === "1251915536065892413") {
                msg.channel.send("** Trying to gift the georgeos danielle? **");
                return;
            }

            if (targetUser === msg.author) {
                msg.channel.send("** Trying to gift yourself? **");
                return;
            }
            if (isNaN(numberOfCopiesToGive)) {
                msg.channel.send(
                    "Please ensure you have given a card id and amount to gift",
                ); //theyve tried to give an invalid amount
                return;
            }
            if (numberOfCopiesToGive == 0) {
                msg.channel.send("Please give a non zero amount to gift"); //theyve tried to give an invalid amount
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

        if(command === "w" ){
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
            const dailyCd = Date.now() + 1 * 1000;
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
            getDaily(msg, userId);
        }

        if(command === "inv"){
            const listOfCards = await getUserCards("user-cards", userId);
            const cardsPerPage = 4;
            const totalPages = Math.ceil(listOfCards.length / cardsPerPage);

            const embedMessage = await msg.channel.send({ embeds: [await generateEmbedInv(0, totalPages, listOfCards, msg)], components: [generateRowInv(0, totalPages)] });

            handleCollectorInv(embedMessage, msg, totalPages, listOfCards);
        }

        if(command === "feed"){
            const input = args.filter(code => code.trim() !== "");
            const cardId = input[0];
            const numberOfCards = input[1];
            const temp = await awardExp(userId, String(cardId), numberOfCards);
            if(temp === 0){
                msg.reply("**You do not own this card**");
            }
            if(temp === 1){
                msg.reply("**You do not own enough copies**");
            }
            if(temp === 2){
                msg.reply("**Your card is already at max level!**");
            }
        }
    }
});



client.login(process.env.Token);
