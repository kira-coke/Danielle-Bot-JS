const AWS = require('aws-sdk');
const {getUserCard, getHowManyCopiesOwned} = require("./cards.js");

const dynamodb = new AWS.DynamoDB.DocumentClient

async function awardExp(userId, cardId, numberOfCards){
  const expGiven = numberOfCards * 50; //each card gives 50 exp
  const card = await getUserCard("user-cards", userId, cardId); //geting the user card with this id
  if(card[0] === undefined){
    console.log("User does not own this card");
    return 0;
  }
  const cardsCurrentlyOwned = await getHowManyCopiesOwned("user-cards", userId, cardId);
  if((cardsCurrentlyOwned === 1)|| (cardsCurrentlyOwned<numberOfCards)){
    console.log("User does not own enough cards to feed");
    return 1;
  }
  const cardData = card[0];
  if(cardData.level === 100){
    if(cardData.tier != 3){
      console.log(cardData.upgradable);
      cardData.upgradable = true;
      await updateUserData("user-cards", cardData);
      console.log("User is already at max level");
      return 2;
    }
  }
  const newExp = cardData.exp += expGiven; //the new exp for the card
  const levelUpXP = calculateLevelUpXP(cardData.level);
    if (newExp >= levelUpXP) {
        cardData.level += 1;
        cardData.exp -= levelUpXP;
    }
  cardData.exp = newExp;
  await updateUserData("user-cards", cardData);
}

function calculateLevelUpXP(level) {
   if(level === 0){
     return 0; // no ore exp is needed to level up
   }
   return Math.round(100 * Math.pow(1.1, level - 1));
}

async function upgrade(userId, cardId){
  const card = await getUserCard("user-cards", userId, cardId);
  const cardData = card[0];
  if(cardData.tier === 3){
    //at max level
    return 0;
  }
  const temp = await awardExp(userId, String(cardId), 0);
  if(temp === 2){
    cardData.level = 0;
    cardData.exp = 0;
    cardData.upgradable = false;
    cardData.tier = cardData.tier+1;
    await updateUserData("user-cards", cardData);
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