const AWS = require('aws-sdk');
//const s3 = new AWS.S3();
const dynamodb = new AWS.DynamoDB.DocumentClient
const { EmbedBuilder } = require("discord.js");
const {getUserCard} = require("./cards");

const dungeons = [
    { name: 'Dungeon of JYP (1)', description: ' ', baseWinRate: 1.5},
    { name: 'Cavern of SM (2)', description: ' ', baseWinRate: 1 },
    { name: 'Tower of HYBE (3)', description: '', baseWinRate: 0.5 }
];

async function enterDg(msg, userId, cardId, dg){
  console.log(dg);
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
          console.log(result);
          break;
      case "2":
          winRate = dungeons[1].baseWinRate + multiplier;
          result =  (winRate * dungeons[1].baseWinRate).toFixed(2);
          dgEntered = 2;
          console.log(result);
          break;
      case "3":
          winRate = dungeons[2].baseWinRate + multiplier;
          result =  (winRate * dungeons[2].baseWinRate).toFixed(2);
          dgEntered = 3;
          console.log(result);
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
          value: `\nCongrats! You have: Won!`,
          inline: false
      });
    }else {
       embed.setColor("dd2d4a");
        embed.addFields({
            name: ' ',
            value: `\nYou have failed to deafeat JYP :( \n\n**Better luck next time!**`,
            inline: false
        });
    }
  }

  if(dgEntered === 2){
    embed.setTitle(dungeons[1].name);
    const winOrLoss = Math.random() * 100 < result ? "Win" : "Fail";
    if(winOrLoss === "Win"){
      embed.setColor("04a777");
      embed.addFields({
          name: ' ',
          value: `\nCongrats! You have: Won!`,
          inline: false
      });
    }else {
       embed.setColor("dd2d4a");
        embed.addFields({
            name: ' ',
            value: `\nYou have failed to deafeat SM :( \n\n**Better luck next time!**`,
            inline: false
        });
    }
  }

  if(dgEntered === 3){
    embed.setTitle(dungeons[2].name);
    const winOrLoss = Math.random() * 100 < result ? "Win" : "Fail";
    if(winOrLoss === "Win"){
      embed.setColor("04a777");
      embed.addFields({
          name: ' ',
          value: `\nCongrats! You have: Won!`,
          inline: false
      });
    }else {
       embed.setColor("dd2d4a");
        embed.addFields({
            name: ' ',
            value: `\nYou have failed to deafeat HYBE :( \n\n**Better luck next time!**`,
            inline: false
        });
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
      console.log(winRate*dungeon.baseWinRate);
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

module.exports = {enterDg, dgWinRates};