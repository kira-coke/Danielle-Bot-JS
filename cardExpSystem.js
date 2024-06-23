const AWS = require('aws-sdk');
const {getUserCard, getHowManyCopiesOwned} = require("./cards.js");
const { EmbedBuilder, bold } = require("discord.js");
const dynamodb = new AWS.DynamoDB.DocumentClient

async function awardExp(userId, cardId, numberOfCards, msg){
  const expGiven = numberOfCards * 50; //each card gives 50 exp
  const card = await getUserCard("user-cards", userId, cardId); //geting the user card with this id
  if(card[0] === undefined){
    console.log("User does not own this card");
    return 0;
  }
  const cardsCurrentlyOwned = await getHowManyCopiesOwned("user-cards", userId, cardId);
  if((cardsCurrentlyOwned === 1)|| (cardsCurrentlyOwned<=numberOfCards)){
    console.log("User does not own enough cards to feed");
    return 1;
  }
  const cardData = card[0];
  if(cardData.level > 20){
    msg.reply("Your card is ready to upgrade!");
    return;
  }
  if(cardData.level === 20){
    console.log(cardData.upgradable);
    cardData.upgradable = true;
    await updateUserData("user-cards", cardData);
    console.log("User is already at max level");
    return 2;
  }
  const newExp = cardData.exp += expGiven; //the new exp for the card
  const levelUpXP = calculateLevelUpXP(cardData.level);
    if (newExp >= levelUpXP) {
        cardData.level += 1;
        cardData.exp -= levelUpXP;
    }
  cardData.exp = newExp;
  
  while (cardData.exp >= calculateLevelUpXP(cardData.level) && cardData.level < 100) {
    const levelUpXP = calculateLevelUpXP(cardData.level);
    if (cardData.exp >= levelUpXP) {
      cardData.exp -= levelUpXP;
      cardData.level += 1;
    }
  }
  
  await updateUserData("user-cards", cardData);
  const nextLevelExp = calculateLevelUpXP(cardData.level) - cardData.exp;

  const embed = new EmbedBuilder()
      .setColor("#779be7")
      .setTitle("Card Experience Gained")
      .setDescription(`Your **${cardId}** has gained **${expGiven} EXP**!`)
      .addFields(
          { name: "Current EXP", value: `${cardData.exp}`, inline: true },
          { name: "Current Level", value: `${cardData.level}`, inline: true },
         { name: "EXP Needed for Next Level", value: `${nextLevelExp}`, inline: true }
      )
      .setTimestamp();

  if (newExp >= levelUpXP) {
    if(cardData.level > 20){
      embed.addFields({ name: "Level Up!", value: `Your card has leveled up to **Level ${cardData.level}**! \n ${bold("WARNING: This has overfed your card, do .upgrade to upgrade!")}` });
      
    }else{
      embed.addFields({ name: "Level Up!", value: `Your card has leveled up to **Level ${cardData.level}**!` });
    }
  }

  msg.channel.send({ embeds: [embed] });

}

function calculateLevelUpXP(level) {
   if(level === 0){
     return 0; // no more exp is needed to level up
   }
   return Math.round(100 * Math.pow(1.1, level - 1));
}

async function upgrade(userId, cardId, msg){
  const card = await getUserCard("user-cards", userId, cardId);
  const cardData = card[0];
  if(cardData.level != 20){
    msg.reply("You must be at max level to upgrade");
    return;
  }
  const temp = await awardExp(userId, String(cardId), 0, msg);
  if(temp === 2){
    cardData.level = 0;
    cardData.exp = 0;
    cardData.upgradable = false;
    cardData.tier = cardData.tier+1;
    await updateUserData("user-cards", cardData);
    const embed = new EmbedBuilder()
      .setColor("#00FF00")
      .setTitle("Card Upgrade!")
      .setDescription(`Your **${cardId}** has been upgraded to **Tier ${cardData.tier}**!`)
      .addFields(
        { name: "New Tier", value: `${cardData.tier}`, inline: true },
        { name: "Current Level", value: `${cardData.level}`, inline: true },
        { name: "Current EXP", value: `${cardData.exp}`, inline: true }
      )
      .setTimestamp();

    msg.channel.send({ embeds: [embed] });
    return true;
  }else {
    return false;
  }
}


async function updateUserData(tableName, cardData) {
  try{
    const params = {
        TableName: tableName,
        Item: cardData
    };

    await dynamodb.put(params).promise();
  } catch (error) {
      console.error('Error updating exp:', error);
      throw error;
  }
  
}

module.exports = {awardExp, upgrade};