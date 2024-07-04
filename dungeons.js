const AWS = require('aws-sdk');
//const s3 = new AWS.S3();
const dynamodb = new AWS.DynamoDB.DocumentClient
const { EmbedBuilder, inlineCode } = require("discord.js");
const {getUserCard, changeNumberOwned, getHowManyCopiesOwned} = require("./cards");
const {getUsersBalance, saveUserBalance} = require("./userBalanceCmds");
const emote = '<:DB_currency:1257694003638571048>'; 

const dungeons = [
    { name: 'Dungeon of JYP (1)', description: ' ', baseWinRate: 1.5},
    { name: 'Cavern of SM (2)', description: ' ', baseWinRate: 1 },
    { name: 'Tower of HYBE (3)', description: '', baseWinRate: 0.5 }
];

async function enterDg(msg, userId, cardId, dg){
  const cardWinRateModifier = await getCardWinRateModifier("user-cards", userId, cardId);
  const multiplier = cardWinRateModifier * 0.005;
  let dgEntered = 0;
  let winRate = 0;
  let result = 0;
  switch (dg) {
      case "1":
          winRate = dungeons[0].baseWinRate + multiplier;
          result =  (winRate * dungeons[0].baseWinRate).toFixed(2);
          dgEntered = 1;
          break;
      case "2":
          winRate = dungeons[1].baseWinRate + multiplier;
          result =  (winRate * dungeons[1].baseWinRate).toFixed(2);
          dgEntered = 2;
          break;
      case "3":
          winRate = dungeons[2].baseWinRate + multiplier;
          result =  (winRate * dungeons[2].baseWinRate).toFixed(2);
          dgEntered = 3;
          break;
      default:
          console.log("Invalid dungeon selection");
          return;
  }

  const embed = new EmbedBuilder();
  
  if(dgEntered === 1){
    embed.setTitle(dungeons[0].name);
    const winOrLoss = Math.random() * 100 < result ? "Win" : "Fail";
    if(winOrLoss === "Win"){
      embed.setColor("04a777");
      embed.addFields({
          name: ' ',
          value: `\nCongrats, you have: Won!`,
          inline: false
      });
      const randomCardAmount = Math.floor(Math.random() * 2);
      const randomAmount = Math.floor(Math.random() * (7500 - 5000+ 1)) + 2500;
      const randomAmountWithCommans = numberWithCommas(randomAmount);
      const currentBalance = await getUsersBalance(userId);
      await saveUserBalance(userId, currentBalance+randomAmount)
      const newBalance = await getUsersBalance(userId);
      const newBalanceWithCommans = numberWithCommas(newBalance);
      embed.setImage("https://danielle-bot-images.s3.eu-west-2.amazonaws.com/gifs/anime-fight-angel-beats-3ngeq69lph4sfgw7-ezgif.com-webp-to-gif-converter.gif");
      embed.addFields({
          name: ` `,
          value: `\nYou have earned: ${inlineCode(randomAmountWithCommans)}${emote}\nYou now have: ${inlineCode(newBalanceWithCommans)}${emote}`,
          inline: false
      })
      if(randomCardAmount === 1){
        const amountCurrentlyOwned = await getHowManyCopiesOwned("user-cards", userId , cardId,);
        try{
          await changeNumberOwned("user-cards", userId, cardId, amountCurrentlyOwned+1);
        }catch(error){
          console.log("Error", error);
        }
        embed.addFields({
          name: ' ',
          value: `\nYou have received 1 copy of ${inlineCode(cardId)}`,
          inline: false
        });
      }
    }else {
       embed.setColor("dd2d4a");
        embed.addFields({
            name: ' ',
            value: `\nYou have failed to defeat JYP. \n\n**Better luck next time!**`,
            inline: false
        });
      embed.setImage("https://danielle-bot-images.s3.eu-west-2.amazonaws.com/gifs/icegif-222.gif");
    }
  }

  if(dgEntered === 2){
    embed.setTitle(dungeons[1].name);
    const winOrLoss = Math.random() * 100 < result ? "Win" : "Fail";
    if(winOrLoss === "Win"){
      embed.setColor("04a777");
      embed.addFields({
          name: ' ',
          value: `\nCongrats, you have: Won!`,
          inline: false
      });
      const randomCardAmount = Math.floor(Math.random() * 2) + 1;
      const randomAmount = Math.floor(Math.random() * (10000- 7500 + 1)) + 7500;
      const randomAmountWithCommans = numberWithCommas(randomAmount);
      const currentBalance = await getUsersBalance(userId);
      await saveUserBalance(userId, currentBalance+randomAmount)
      const newBalance = await getUsersBalance(userId);
      const newBalanceWithCommans = numberWithCommas(newBalance);
      embed.setImage("https://danielle-bot-images.s3.eu-west-2.amazonaws.com/gifs/anime-fight-flying-kick-o4ddmhew9wwdpp5w-ezgif.com-webp-to-gif-converter.gif");
      embed.addFields({
          name: ` `,
          value: `\nYou have earned: ${inlineCode(randomAmountWithCommans)}${emote}\nYou now have: ${inlineCode(newBalanceWithCommans)}${emote}`,
          inline: false
      })
      if(randomCardAmount === 1){
        const amountCurrentlyOwned = await getHowManyCopiesOwned("user-cards", userId , cardId,);
        try{
          await changeNumberOwned("user-cards", userId, cardId, amountCurrentlyOwned+1);
        }catch(error){
          console.log("Error", error);
        }
        embed.addFields({
          name: ' ',
          value: `\nYou have received 1 copy of ${inlineCode(cardId)}`,
          inline: false
        });
      }else {
        const amountCurrentlyOwned = await getHowManyCopiesOwned("user-cards", userId , cardId,);
        try{
          await changeNumberOwned("user-cards", userId, cardId, amountCurrentlyOwned+2);
        }catch(error){
          console.log("Error", error);
        }
        embed.addFields({
          name: ' ',
          value: `\nYou have received 2 copies of ${inlineCode(cardId)}`,
          inline: false
        });
      }
    }else {
       embed.setColor("dd2d4a");
        embed.addFields({
            name: ' ',
            value: `\nYou have failed to defeat SM. \n\n**Better luck next time!**`,
            inline: false
        });
      embed.setImage("https://danielle-bot-images.s3.eu-west-2.amazonaws.com/gifs/icegif-222.gif");
    }
  }

  if(dgEntered === 3){
    embed.setTitle(dungeons[2].name);
    const winOrLoss = Math.random() * 100 < result ? "Win" : "Fail";
    if(winOrLoss === "Win"){
      embed.setColor("04a777");
      embed.addFields({
          name: ' ',
          value: `\nCongrats, you have: Won!`,
          inline: false
      });
      const randomCardAmount = Math.floor(Math.random() * 2) + 2;
      const randomAmount = Math.floor(Math.random() * (15000 - 10000+ 1)) + 10000;
      const randomAmountWithCommans = numberWithCommas(randomAmount);
      const currentBalance = await getUsersBalance(userId);
      await saveUserBalance(userId, currentBalance+randomAmount)
      const newBalance = await getUsersBalance(userId);
      const newBalanceWithCommans = numberWithCommas(newBalance);
      embed.setImage("https://danielle-bot-images.s3.eu-west-2.amazonaws.com/gifs/anime-fight-mahito-po170m79sga5rnzp-ezgif.com-webp-to-gif-converter.gif");
      embed.addFields({
          name: ` `,
          value: `\nYou have earned: ${inlineCode(randomAmountWithCommans)}${emote}\nYou now have: ${inlineCode(newBalanceWithCommans)}${emote}`,
          inline: false
      })
      if(randomCardAmount === 2){
        const amountCurrentlyOwned = await getHowManyCopiesOwned("user-cards", userId , cardId,);
        try{
          await changeNumberOwned("user-cards", userId, cardId, amountCurrentlyOwned+2);
        }catch(error){
          console.log("Error", error);
        }
        embed.addFields({
          name: ' ',
          value: `\nYou have received 2 copies of ${inlineCode(cardId)}`,
          inline: false
        });
      }else {
        const amountCurrentlyOwned = await getHowManyCopiesOwned("user-cards", userId , cardId,);
        try{
          await changeNumberOwned("user-cards", userId, cardId, amountCurrentlyOwned+3);
        }catch(error){
          console.log("Error", error);
        }
        embed.addFields({
          name: ' ',
          value: `\nYou have received 3 copies of ${inlineCode(cardId)}`,
          inline: false
        });
      }
    }else {
       embed.setColor("dd2d4a");
        embed.addFields({
            name: ' ',
            value: `\nYou have failed to defeat HYBE. \n\n**Better luck next time!**`,
            inline: false
        });
      embed.setImage("https://danielle-bot-images.s3.eu-west-2.amazonaws.com/gifs/icegif-222.gif");
    }
  }
  msg.channel.send({ embeds: [embed] });
}

async function dgWinRates(msg, userId, cardId){
   const cardWinRateModifier = await getCardWinRateModifier("user-cards", userId, cardId);
   const multiplier = cardWinRateModifier * 0.005;
    const embed = new EmbedBuilder()
        .setTitle('Dungeon Win Rates')
        .setDescription(`User ID: ${msg.author.username} | Card ID: ${cardId}`);

  dungeons.forEach(dungeon => {
      const winRate = dungeon.baseWinRate + multiplier;
      if(winRate*dungeon.baseWinRate > 100){
        embed.addFields({
            name: dungeon.name,
            value: `${dungeon.description}\nWin Rate: ${(100).toFixed(2)}%`,
            inline: false
        });
      }else{
        embed.addFields({
            name: dungeon.name,
            value: `${dungeon.description}\nWin Rate: ${(winRate * dungeon.baseWinRate).toFixed(2)}%`,
            inline: false
        });
      }
  });
    return embed;
}

async function getCardWinRateModifier(tableName, userId, cardId) { //change to query the datavbase and get card level
   const card = await getUserCard(tableName, userId, cardId);
   const cardExp= card[0].totalExp;
   return cardExp || 0;
}

function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

module.exports = {enterDg, dgWinRates};