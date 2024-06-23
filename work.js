const {getUsersBalance, saveUserBalance} = require("./userBalanceCmds");
const { EmbedBuilder } = require("discord.js");
const Discord = require("discord.js");

async function work(msg, userId){
  const userBal = await getUsersBalance(userId);
  const randomNumber = Math.floor(Math.random() * (1500 - 500 + 1)) + 500;
  const newBalance = userBal + randomNumber;
  function numberWithCommas(x) {
      return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  const bonusNumber = Math.floor(Math.random() * 10) + 1; //change the 100 value to alter percentage of bonus
  if(bonusNumber === 1){
    const numberWithBonuses = randomNumber * 2;
    const newBalanceWithBonuses = userBal+ numberWithBonuses;
    const balanceFormated = numberWithCommas(newBalanceWithBonuses);

    const balanceEmbed = new EmbedBuilder()
        .setColor("#3498DB")
        .setTitle(`Congrats! You worked extra hard and have earned double: ${Discord.inlineCode(numberWithCommas(numberWithBonuses))}`)
        .setDescription(
            "**New balance: **" + Discord.inlineCode(`${balanceFormated}`),
        )
        .setTimestamp();
    msg.channel.send({ embeds: [balanceEmbed] });
    await saveUserBalance(userId, newBalanceWithBonuses);
    return;
  }
  const balWithCommas = numberWithCommas(newBalance);

  const balanceEmbed = new EmbedBuilder()
      .setColor("#ffa791")
      .setTitle(`You worked hard and earned: ${Discord.inlineCode(numberWithCommas(randomNumber))}`)
      .setDescription(
          "**New balance: **" + Discord.inlineCode(`${balWithCommas}`),
      )
      .setTimestamp();
      msg.channel.send({ embeds: [balanceEmbed] });
      await saveUserBalance(userId, newBalance);
  }

module.exports = {work};
