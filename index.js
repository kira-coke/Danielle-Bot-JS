require("dotenv").config();
//console.log(process.env);
const Discord = require("discord.js");
const {GatewayIntentBits} = require('discord.js');
const client = new Discord.Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});
const { EmbedBuilder } = require("discord.js");
const { startEmbed } = require("./start.js");
const { profileEmbed } = require("./profile.js");
const { claimEmbed } = require("./claim.js");
const { dropEmbed } = require("./drop.js")

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on("messageCreate", (msg) => {
  if (msg.content === "test"){
    message.channel.send(`Working on it!`);
  }
});

client.on("messageCreate", (msg) => {
  if (msg.author.bot) return 

  if (msg.content === "!start") {
    msg.reply(startEmbed.setThumbnail(msg.author.displayAvatarURL()))
      .catch(console.error);
  }

  if (msg.content === "!profile") {
    msg.reply(profileEmbed.setTitle("**Displaying **" + msg.author.username + "**'s profile**")      .setThumbnail(msg.author.displayAvatarURL()))
      .catch(console.error);
  }

  if (msg.content === "!claim") {
    const authorTag = `${msg.author.username}#${msg.author.discriminator}`;
    const authorAvatarURL = msg.author.displayAvatarURL();
    const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle(authorTag)
        .setDescription('\n\u200B\n**Claim Recieved**\n')
        .setImage(
  "https://media.discordapp.net/attachments/1112196173491601409/1252081476539777076/NJ_DN_HB.png?ex=6670eb3e&is=666f99be&hm=9e6d5014856eba344300a38d0c306e094c15be3a803e1d1c69c47a980fa5bb76&=&format=webp&quality=lossless&width=446&height=662",
        )
        .setThumbnail(authorAvatarURL)
        .setTimestamp();
    msg.reply({ embeds: [embed] });
  }

   if (msg.content === "!drop") {
  msg.reply(dropEmbed.setThumbnail(msg.author.displayAvatarURL()).setAuthor(msg.author.username))
        .catch(console.error);
    }
  
});

module.exports = {client};
client.login(process.env.TOKEN);

