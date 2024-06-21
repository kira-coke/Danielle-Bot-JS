const {getUsersBalance, saveUserBalance} = require("./userBalanceCmds");
const { EmbedBuilder } = require("discord.js");
const Discord = require("discord.js");

async function work(msg, userId){
  const userBal = await getUsersBalance(userId);
  const randomNumber = Math.floor(Math.random() * (1500 - 500 + 1)) + 500;
  const newBalance = userBal + randomNumber;
  await saveUserBalance(userId, newBalance);
  function numberWithCommas(x) {
      return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  const balWithCommas = numberWithCommas(newBalance);

  const balanceEmbed = new EmbedBuilder()
      .setColor("#ffa791")
      .setTitle(`Congrats you worked hard and earned ${Discord.inlineCode(numberWithCommas(randomNumber))}`)
      .setDescription(
          "**New balance: **" + Discord.inlineCode(`${balWithCommas}`),
      )
      .setTimestamp();
  msg.channel.send({ embeds: [balanceEmbed] });
  }

module.exports = {work};
