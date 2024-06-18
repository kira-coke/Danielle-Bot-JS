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
        const authorAvatarURL = msg.author.displayAvatarURL();
        if (msg.author.bot) return;

        if (command === "start") {
            const userExists = await checkUserExists(userId);

            if (userExists) {
                msg.channel.send(`**You are already registered!**`);
                return;
            }
            
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
            //msg.channel.send(`Welcome to danielle bot ${msg.author.username}`);
        }

        if (command === "profile") {
            const embed = new EmbedBuilder()
                .setColor(0x0099ff) //should be able to change colour
                .setTitle(authorTag)
                .setDescription("\u200B\n**Kira's temp profile**\n") //make this communicate with database so users can change desc
                .setThumbnail(authorAvatarURL)
                .setImage(
                    "https://danielle-bot-images.s3.eu-west-2.amazonaws.com/NJ_DN_HB.png",
                ) //they should be able to change this - change card etc
                .setTimestamp();
            msg.reply({ embeds: [embed] });
        }

        if (command === "claim") {
            // get a random card from the storage and store the details to be able to be used in bellow embeded message
            const embed = new EmbedBuilder()
                .setColor(0x0099ff)
                .setTitle(authorTag)
                .setDescription("\n\u200B\n**Claim Recieved**\n") // changed depeneding on the card recieced
                .setImage(
                    "https://danielle-bot-images.s3.eu-west-2.amazonaws.com/NJ_HR_HB.png",
                ) // changed depending on the card recieved
                .setThumbnail(authorAvatarURL)
                .setTimestamp();
            msg.reply({ embeds: [embed] });
            // after all that tell the database this user now has this card in their inv
        }

        if (command === "drop") {
            // get a 3 random cards from the storage and store the details to be able to be used in bellow embeded message
            // put those 3 cards into a collage and send it to the user
            // register which button the user clicked and then which image (card) corresponds
            // add card to their inv in database
            const embed = new EmbedBuilder()
                .setColor(0x0099ff)
                .setTitle("**Drop recieved**")
                .setDescription(
                    "\n\u200B\n**Click an option bellow to claim a card**\n",
                )
                .setImage(
                    "https://media.discordapp.net/attachments/1112196173491601409/1252084517733142640/Untitled_1.png?ex=6670ee13&is=666f9c93&hm=c939ea279d4235e16386948c6b2adb308741eb6ddf75e68ecffa2d652fec571d&=&format=webp&quality=lossless&width=687&height=340",
                )
                .setThumbnail(authorAvatarURL)
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("button1")
                    .setLabel("Button 1")
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId("Card2")
                    .setLabel("Button 2")
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId("Card3")
                    .setLabel("Button 3")
                    .setStyle(ButtonStyle.Primary),
            );

            msg.reply({ embeds: [embed], components: [row] });
        }

        client.on(Events.InteractionCreate, async (interaction) => {
            if (!interaction.isButton()) return;

            await interaction.deferUpdate();
            let response;

            switch (interaction.customId) {
                case "button1":
                    response = "You have claimed card 1!";
                    break;
                case "button2":
                    response = "You have claimed card 2!";
                    break;
                case "button3":
                    response = "You have claimed card 3!";
                    break;
            }

            await interaction.followUp({ content: response, ephemeral: true });
        });
    }

    async function saveUserData(userId) {
        const params = {
            TableName: 'Dani-bot-playerbase',
            Item: {
                'user-id': userId,
                'Balance': 10000,
                'Enabled': true,
                'Join date': msg.createdTimestamp
            }
        };

        try {
            await dynamodb.put(params).promise();
            console.log('Data saved:', userId);
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
});

client.login(process.env.Token);

