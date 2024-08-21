const AWS = require('aws-sdk');
const {getUserCard, getHowManyCopiesOwned, changeNumberOwned, getCardFromTable} = require("./cards.js");
const {getUser, updateTotalExp} = require("./users.js");
const { ActionRowBuilder, ButtonBuilder, EmbedBuilder, inlineCode } = require("discord.js");
const {storePack} = require("./userAssets.js")
const {handleFeedAction} = require("./quests.js");
const dynamodb = new AWS.DynamoDB.DocumentClient

async function awardExp(userId, cardId, numberOfCards, msg, type){
    const user = await getUser(userId);
    let expGiven = numberOfCards * 50; //each card gives 50 exp
    const card = await getUserCard("user-cards", userId, cardId); //geting the user card with this id
    if(card[0] === undefined){
      console.log("User does not own this card");
      return 0;
    }
    const cardData = card[0];
    if(cardData.level === 20){
      console.log(cardData.upgradable);
      cardData.upgradable = true;
      await updateUserData("user-cards", cardData);
      console.log("User is already at max level");
      return 2;
    }
    const cardsCurrentlyOwned = await getHowManyCopiesOwned("user-cards", userId, cardId);
    if((cardsCurrentlyOwned === 1)|| (cardsCurrentlyOwned<=numberOfCards)){
      console.log("User does not own enough cards to feed (you must keep at least 1 copy)");
      return 1;
    }
    if(cardData.level > 20){
        console.log("Your card is ready to upgrade!");
        return 2;
    }
    if(cardData.level >= 10){
      awardPack = false;
    }
    const cardBaseData = await getCardFromTable("cards", cardId);
    console.log(cardBaseData.cardRarity);
    if(cardBaseData.cardRarity != 1 ){
      expGiven = numberOfCards * 75;
      //console.log(expGiven);
    }
    const wasBelowLevel10 = cardData.level < 10;
    const potentialNewExp = cardData.exp + expGiven;
    const potentialNewLevel = calculatePotentialNewLevel(cardData.level, potentialNewExp);
    const expNeeded = calculateLevelUpXP(cardData.level);
    if (potentialNewLevel >= 20 && cardData.level < 20) {
      if(type === "single"){ //only want to do this embed if the type is 1 single feed
        const embed = new EmbedBuilder()
          .setColor("#ED4245")
          .setTitle("EXP Warning")
          .setDescription(`Giving **${expGiven} EXP** to your **${cardId}** will over level the card!`)
          .addFields(
            //{ name: "Exp needed to next level up", value: `${calculateExpNeededToMax(cardData.level, cardData.exp)}`, inline: true},
            { name: "Exp needed to max card", value: `${expNeeded - cardData.exp}`, inline: true},
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
            await handleExpAward(userId, cardId, numberOfCards, msg, user, cardData, expGiven, potentialNewExp, type, interaction);
            await storePack(userId);
            await storePack(userId);
            const packEmbed = new EmbedBuilder().setTitle("Packs added to inv!").setColor("#ff4d6d").setDescription("Congrats! You have reached max level and recieved 2 packs. These have been added to .packs").setImage("https://danielle-bot-images.s3.eu-west-2.amazonaws.com/assets/CARDPACK.png");
            const userOwns = await getHowManyCopiesOwned("user-cards", userId, cardId);
            await changeNumberOwned("user-cards", userId, cardId, (userOwns - numberOfCards));
            await handleFeedAction(userId, parseInt(numberOfCards), msg);
            msg.channel.send({ embeds: [packEmbed] });
          } else {
            await interaction.update({ content: 'Cancelled feeding', embeds: [], components: [] });
          }
        });
      }else{
        return false; //skip this card but return this to notify user
      }
    } else {
      await handleExpAward(userId, cardId, numberOfCards, msg, user, cardData, expGiven, potentialNewExp, type);
      if (wasBelowLevel10 && cardData.level >= 10 && cardData.level < 20) {
        console.log("User has been awarded pack for level 10");
        await storePack(userId);
        const packEmbed = new EmbedBuilder().setTitle("Pack added to inv!").setColor("#ff4d6d").setDescription("Congrats! You have reached level 10 and received 1 pack. This has been added to .packs").setImage("https://danielle-bot-images.s3.eu-west-2.amazonaws.com/assets/CARDPACK.png");
        msg.channel.send({ embeds: [packEmbed] });
      }
      const userOwns = await getHowManyCopiesOwned("user-cards", userId, cardId);
      await changeNumberOwned("user-cards", userId, cardId, (userOwns - numberOfCards)); 
      await handleFeedAction(userId, parseInt(numberOfCards), msg);
    }
  }
  
async function handleExpAward(userId, cardId, numberOfCards, msg, user, cardData, expGiven, newExp, type, interaction) {
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

  if(type === "single"){
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
}

function calculateLevelUpXP(level) {
   if(level === 20){
     return 0; // no more exp is needed to level up
   }
   return Math.round(100 * Math.pow(1.1, level));
}

function calculatePotentialLevelUpXP(level) {
   return Math.round(100 * Math.pow(1.1, level));
}

function calculatePotentialNewLevel(level, exp) {
  while (exp >= calculatePotentialLevelUpXP(level)) {
    exp -= calculatePotentialLevelUpXP(level);
    level += 1;
  }
  return level;
}

function calculateExpNeededToMax(level, currentExp) {
  let expNeeded = 0;
  for (let lvl = level; lvl < 20; lvl++) {
    expNeeded += calculatePotentialLevelUpXP(lvl);
  }
  expNeeded -= currentExp;

  return expNeeded;
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
  const temp = await awardExp(userId, String(cardId), 0, msg, "single");
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

async function groupFeed(userId, filteredCards){
  let nonLeveledCards = [];
  let leveledCards = [];

  const cardProcessingPromises = filteredCards.map(async (card) => {
      const userCard = await getUserCard("user-cards", userId, card["card-id"]);
      const cardData = userCard[0];
      if (cardData.level === 20) {
          nonLeveledCards.push(card["card-id"]);
      } else {
          const copies = await getHowManyCopiesOwned("user-cards", userId, card["card-id"]);
          const numberToFeed = copies - 1;
          const result = await awardExp(userId, card["card-id"], numberToFeed, null, "group");
          if (result === false || result === 0 || result === 1 || result === 2) {
              nonLeveledCards.push(card["card-id"]);
          } else {
              leveledCards.push(card["card-id"]);
          }
      }
  });

  try{
    await Promise.all(cardProcessingPromises);
  }catch(error){
    console.log("Something went wrong processing all the cards");
  }

  const embed = {
    title: "Group Feed Results",
    color: 0xb388eb,
    fields: []
  };

  if (leveledCards.length > 0) {
    embed.fields.push({
        name: "Leveled Cards",
        value: inlineCode(leveledCards.join(", ")),
        inline: false
    });
  }

  if (nonLeveledCards.length > 0) {
    embed.fields.push({
        name: "Skipped Cards",
        value: inlineCode(nonLeveledCards.join(", ")),
        inline: false
    });
  }
  console.log(leveledCards);
  console.log(nonLeveledCards);
  return embed;
}

module.exports = {awardExp, upgrade, calculateLevelUpXP, updateUserData, groupFeed};