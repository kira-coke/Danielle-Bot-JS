const AWS = require('aws-sdk');
const {getUserCard, getHowManyCopiesOwned} = require("./cards.js");
const {getUser, updateTotalExp} = require("./users.js");
const { ActionRowBuilder, ButtonBuilder, EmbedBuilder } = require("discord.js");
const dynamodb = new AWS.DynamoDB.DocumentClient

async function awardExp(userId, cardId, numberOfCards, msg){
  const user = await getUser(userId);
  const expGiven = numberOfCards * 50; //each card gives 50 exp
  const card = await getUserCard("user-cards", userId, cardId); //geting the user card with this id
  if(card[0] === undefined){
    console.log("User does not own this card");
    return 0;
  }
  const cardsCurrentlyOwned = await getHowManyCopiesOwned("user-cards", userId, cardId);
  if((cardsCurrentlyOwned === 1)|| (cardsCurrentlyOwned<=numberOfCards)){
    console.log("User does not own enough cards to feed (you must keep at least 1 copy)");
    return 1;
  }
  const cardData = card[0];
  if(cardData.level === 20){
    console.log(cardData.upgradable);
    cardData.upgradable = true;
    await updateUserData("user-cards", cardData);
    console.log("User is already at max level");
    return 2;
  }
  if(cardData.level > 20){
      console.log("Your card is ready to upgrade!");
      return 2;
  }
    const potentialNewExp = cardData.exp + expGiven;
    const potentialNewLevel = calculatePotentialNewLevel(cardData.level, potentialNewExp);
    const expNeeded = calculateLevelUpXP(cardData.level);

    if (potentialNewLevel > 20 && cardData.level < 20) {
      const embed = new EmbedBuilder()
        .setColor("#ED4245")
        .setTitle("EXP Warning")
        .setDescription(`Giving **${expGiven} EXP** to your **${cardId}** will over level the card!`)
        .addFields(
          { name: "Exp needed to level up", value: `${expNeeded - cardData.exp}`, inline: true},
          { name: "EXP Given", value: `${expGiven}`, inline: true }
        )
        .setTimestamp();

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('confirm')
            .setLabel('Confirm')
            .setStyle("Danger"),
          new ButtonBuilder()
            .setCustomId('cancel')
            .setLabel('Cancel')
            .setStyle("Secondary")
        );

      const message = await msg.channel.send({ embeds: [embed], components: [row] });

      const filter = (interaction) => ['confirm', 'cancel'].includes(interaction.customId) && interaction.user.id === userId;
      const collector = message.createMessageComponentCollector({ filter, time: 60000 }); // 1 min

      collector.on('collect', async interaction => {
        if (interaction.customId === 'confirm') {
          await handleExpAward(userId, cardId, numberOfCards, msg, user, cardData, expGiven, potentialNewExp, interaction);
        } else {
          await interaction.update({ content: 'Cancelled feeding', embeds: [], components: [] });
        }
      });

    } else {
      await handleExpAward(userId, cardId, numberOfCards, msg, user, cardData, expGiven, potentialNewExp);
    }
  }
  
async function handleExpAward(userId, cardId, numberOfCards, msg, user, cardData, expGiven, newExp, interaction) {
  let leveledUp = false; 
  let maxLevel = false;

  while (newExp >= calculateLevelUpXP(cardData.level) && cardData.level < 20) {
    const levelUpXP = calculateLevelUpXP(cardData.level);
    if (newExp >= levelUpXP) {
      newExp -= levelUpXP;
      cardData.level += 1;
      leveledUp = true;
    }
  }
  
  user.TotalExp += expGiven;
  await updateTotalExp("Dani-bot-playerbase", userId, user.TotalExp);
  cardData.exp = newExp;
  cardData.totalExp += expGiven;
  
  await updateUserData("user-cards", cardData);
  const nextLevelExp = calculateLevelUpXP(cardData.level);

  const embed = new EmbedBuilder()
      .setColor("#d66ba0")
      .setTitle("Card Experience Gained")
      .setDescription(`Your **${cardId}** has gained **${expGiven} EXP**!`)
      if(cardData.level === 20){
        maxLevel = true;
        embed.addFields(
          { name: "Level Up!", value: `Your **${cardId}** is now at max level!`, inline: false},
          { name: "Exp needed to level up", value: `0`, inline: false },
        )
        .setTimestamp();
      }else{
        embed.addFields(
          { name: "Current EXP", value: `${cardData.exp}`, inline: false },
          { name: "Current Level", value: `${cardData.level}`, inline: false },
          { name: "EXP Needed for Next Level", value: `${nextLevelExp-cardData.exp}`, inline: false }
        )
        .setTimestamp();   
      }

  if ((leveledUp === true) && (maxLevel != true)) {
      embed.addFields({ name: "Level Up!", value: `Your card has leveled up to **Level ${cardData.level}**!` });
  }
   if (interaction) {
     try{
       await interaction.update({ embeds: [embed], components: [] });
     }catch(error){
       console.log(error);
     }
    } else {
      msg.channel.send({ embeds: [embed] });
    }
  }

function calculateLevelUpXP(level) {
   if(level === 20){
     return 0; // no more exp is needed to level up
   }
   return Math.round(100 * Math.pow(1.1, level));
}

function calculatePotentialNewLevel(level, exp) {
  while (exp >= calculateLevelUpXP(level) && level < 100) {
    exp -= calculateLevelUpXP(level);
    level += 1;
  }
  return level;
}

async function upgrade(userId, cardId, msg){
  const card = await getUserCard("user-cards", userId, cardId);
  const cardData = card[0];
  if(cardData.level != 20){
    if(cardData.level < 20){
      msg.reply("You must be at max level to upgrade");
      return;
    }
  }
  const temp = await awardExp(userId, String(cardId), 0, msg);
  console.log(temp);
  if(temp === 2){
    cardData.level = 0;
    cardData.exp = 0;
    cardData.upgradable = false;
    cardData.tier = cardData.tier+1;
    await updateUserData("user-cards", cardData);
    const embed = new EmbedBuilder()
      .setColor("#04a777")
      .setTitle("Card Upgrade!")
      .setDescription(`Your **${cardId}** has been upgraded to **Tier ${cardData.tier}**!`)
      .addFields(
        { name: "New Tier", value: `${cardData.tier}`, inline: false },
        { name: "Current Level", value: `${cardData.level}`, inline: false },
        { name: "Current EXP", value: `${cardData.exp}`, inline: false }
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

module.exports = {awardExp, upgrade, calculateLevelUpXP};