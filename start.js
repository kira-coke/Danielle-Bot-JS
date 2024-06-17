require("dotenv").config();
console.log(process.env);
const { EmbedBuilder } = require("discord.js");

const startEmbed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle("**Welcome to Danielle bot!**")
      .setDescription("**Enjoy your stay <:daniheart:1251995500308336723>**")
      .setImage(
"https://media.discordapp.net/attachments/863906210582626335/1252011345168175225/newjeans-danielle-omg-4k-wallpaper-uhdpaper.com-2350i.jpg?ex=6670a9ed&is=666f586d&hm=985b63d3eb9d63aa6a86c8479f85e6a1d8aa61d47e5329d011978f35ab3e67a1&=&format=webp&width=1177&height=662",
      )
      .setTimestamp();

 module.exports = { startEmbed };