require("dotenv").config();
const Discord = require("discord.js");
const {GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events } = require('discord.js');
const client = new Discord.Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});
const { EmbedBuilder } = require("discord.js");
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const ak = process.env['Access_key']
const sak = process.env['Secret_access_key']

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on("messageCreate", async (msg) => {
    const authorTag = `${msg.author.username}#${msg.author.discriminator}`;
    const authorAvatarURL = msg.author.displayAvatarURL();
    if (msg.author.bot) return;

    if (msg.content === "!start") {
        const embed = new EmbedBuilder()
            .setColor(0x0099ff)
            .setTitle("**Welcome to Danielle Bot **" + authorTag + "**!**")
            .setDescription(
                "**Enjoy your stay <:daniheart:1251995500308336723>**",
            )
            .setImage(
                "https://media.discordapp.net/attachments/863906210582626335/1252011345168175225/newjeans-danielle-omg-4k-wallpaper-uhdpaper.com-2350i.jpg?ex=6670a9ed&is=666f586d&hm=985b63d3eb9d63aa6a86c8479f85e6a1d8aa61d47e5329d011978f35ab3e67a1&=&format=webp&width=1177&height=662",
            )
            .setTimestamp();
        msg.reply({ embeds: [embed] });
    }

    if (msg.content === "!profile") {
        const embed = new EmbedBuilder()
            .setColor(0x0099ff)
            .setTitle(authorTag)
            .setDescription("\u200B\n**Temporary Profile**\n")
            .setThumbnail(authorAvatarURL)
            .setImage(
                "https://media.discordapp.net/attachments/863906210582626335/1252023196048167034/profile-design-template-4c23db68ba79c4186fbd258aa06f48b3_screen.jpg?ex=6670b4f7&is=666f6377&hm=52d1ff1ea6065152da930bd6f3fcf2b593bcce32206aff6fd5262fd5d137cf89&=&format=webp&width=662&height=662",
            )
            .setTimestamp();
        msg.reply({ embeds: [embed] });
    }

    if (msg.content === "!claim") {
        const embed = new EmbedBuilder()
            .setColor(0x0099ff)
            .setTitle(authorTag)
            .setDescription("\n\u200B\n**Claim Recieved**\n")
            .setImage(
                "https://danielle-bot-images.s3.eu-west-2.amazonaws.com/NJ_HR_HB.png",
            )
            .setThumbnail(authorAvatarURL)
            .setTimestamp();
        msg.reply({ embeds: [embed] });
    }

    if (msg.content === "!drop") {
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

    if (msg.content === "upload") {
        AWS.config.update({
            accessKeyId: ak,
            secretAccessKey: sak,
            region: "eu-west-2",
        });

        const s3 = new AWS.S3();

        async function uploadToS3(filePath, bucketName) {
            const fileContent = fs.readFileSync(filePath);
            const fileName = path.basename(filePath);

            const params = {
                Bucket: bucketName,
                Key: fileName,
                Body: fileContent,
                //ACL: 'public-read'
            };

            try {
                const data = await s3.upload(params).promise();
                console.log(`File uploaded successfully. ${data.Location}`);
                msg.reply("upload image to s3");
                return data.Location;
            } catch (err) {
                console.error(`Error uploading file: ${err.message}`);
                throw err;
            }
        }

        // Usage example
        const filePath = "ENHYPEN_Heeseung_Fatal Trouble_TC.png"; // Path to the image file
        const bucketName = "danielle-bot-images"; // Your S3 bucket name

        uploadToS3(filePath, bucketName)
            .then((url) => {
                console.log(`File uploaded to: ${url}`);
            })
            .catch(console.error);
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
});

client.login(process.env.Token);

