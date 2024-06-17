require("dotenv").config();
console.log(process.env);
const { EmbedBuilder } = require("discord.js");

 const profileEmbed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setDescription("**Temporary Profile**")
      .setImage(
  "https://media.discordapp.net/attachments/863906210582626335/1252023196048167034/profile-design-template-4c23db68ba79c4186fbd258aa06f48b3_screen.jpg?ex=6670b4f7&is=666f6377&hm=52d1ff1ea6065152da930bd6f3fcf2b593bcce32206aff6fd5262fd5d137cf89&=&format=webp&width=662&height=662",
      )
      .setTimestamp();

 module.exports = { profileEmbed };