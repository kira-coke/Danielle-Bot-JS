require("dotenv").config();
console.log(process.env);
const { EmbedBuilder } = require("discord.js");

const dropEmbed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle("**Drop recieved**")
      .setDescription("**Click an option bellow to claim a card**")
      .setImage(
"https://media.discordapp.net/attachments/1112196173491601409/1252084517733142640/Untitled_1.png?ex=6670ee13&is=666f9c93&hm=c939ea279d4235e16386948c6b2adb308741eb6ddf75e68ecffa2d652fec571d&=&format=webp&quality=lossless&width=687&height=340",
      )
      .setTimestamp();
 module.exports = { dropEmbed };