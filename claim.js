require("dotenv").config();
console.log(process.env);
const { EmbedBuilder } = require("discord.js");

const claimEmbed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle("**Claim recieved**")
      .setDescription("**You have dropped Danielle**")
      .setImage(
"https://media.discordapp.net/attachments/1112196173491601409/1252081476539777076/NJ_DN_HB.png?ex=6670eb3e&is=666f99be&hm=9e6d5014856eba344300a38d0c306e094c15be3a803e1d1c69c47a980fa5bb76&=&format=webp&quality=lossless&width=446&height=662",
      )
      .setTimestamp();
 module.exports = { claimEmbed };