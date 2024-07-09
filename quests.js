const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient
const {EmbedBuilder, inlineCode} = require("discord.js");
const {saveUserBalance, getUsersBalance} = require("./userBalanceCmds");
const {storePack} = require("./userAssets");
const {getUser} = require("./users");
const {getHowManyCopiesOwned, changeNumberOwned} = require("./cards")
const isEvent = false;

async function getQuests(tableName){
  const params = {
    TableName: tableName,
  };

  try{
    const data = await dynamodb.scan(params).promise();
    const quests = data.Items;
    return quests;
  }catch(error){
    console.log("Error getting quests:", error);
    throw error;
  }
}

async function setUserQuests(userId, maxQuests = 3){
  const allQuests = await getQuests("quests");
  const userQuests = await getUserQuests(userId);
  const userQuestIds = new Set(userQuests.map(q => q['quest-id'])); //getting all the quest ids the user has
  const availableQuests = allQuests.filter(q => !userQuestIds.has(q['quest-id'])); // filtering available quests 

  const shuffledQuests = shuffle(availableQuests);
  const numCurrentQuests = userQuests.length;
  const numQuestsToAssign = Math.min(maxQuests - numCurrentQuests, shuffledQuests.length);

  if (numQuestsToAssign <= 0) {
    console.log("User has max quests");
    return;
  }

  const questsToAssign = shuffledQuests.slice(0, numQuestsToAssign);

  for (const quest of questsToAssign) {
    quest.progress = 0;
    await assignQuestToUser(userId, quest['quest-id']);
  }

  return questsToAssign;
}

async function assignQuestToUser(userId, questId) {
  const params = {
    TableName: "user-quests",
    Item: {
      "user-id": userId,
      "quest-id": questId,
      "progress": 0,
      "status": "active"
    }
  };

  try {
    await dynamodb.put(params).promise();
  } catch (error) {
    console.log("Error assigning quest:", error);
    throw error;
  }
}

async function getUserQuests(userId){
  const params = {
    TableName: "user-quests",
    KeyConditionExpression: "#uid = :userId",
    ExpressionAttributeNames: {
      "#uid": "user-id"
    },
    ExpressionAttributeValues: {
      ":userId": userId
    }
  };
  
  try {
    const data = await dynamodb.query(params).promise();
    const quests = data.Items;
    return quests;
  } catch (error) {
    console.log("Error getting quests:", error);
    throw error;
  }
}

async function getUserQuest(userId, questId) {
  const params = {
    TableName: "user-quests",
    KeyConditionExpression: "#uid = :userId AND #qid = :questId",
    ExpressionAttributeNames: {
      "#uid": "user-id",
      "#qid": "quest-id"
    },
    ExpressionAttributeValues: {
      ":userId": userId,
      ":questId": questId
    }
  };

  try {
    const data = await dynamodb.query(params).promise();
    const quest = data.Items[0]; // Assuming there's only one item (unique combination of userId and questId)
    return quest;
  } catch (error) {
    console.log("Error getting quest:", error);
    throw error;
  }
}

async function createQuestEmbed(userQuests, msg){
  const embed = new EmbedBuilder()
      .setTitle(`${msg.author.username}'s quests\n\n`)
      .setColor("#6e44ff");
  for (const quest of userQuests) {
    const questData = await getQuest(quest['quest-id']);
    const data = questData[0];
    embed.addFields(
      { name: `Quest: ${data['Description']}`, value: `Progress: ${inlineCode(String(quest.progress)+ "/" + String(data.Criteria))}\nReward: ${inlineCode(data["Reward"])}`, inline: false }
    );
  }
  return embed;
}

async function updateUserQuests(userId, questId, progress){
  const params = {
    TableName: "user-quests",
    Key: {
      "user-id": userId,
      "quest-id": questId
    },
    UpdateExpression: "SET progress = if_not_exists(progress, :start) + :inc",
    ExpressionAttributeValues: {
      ":start": 0,
      ":inc": progress
    },
    ReturnValues: "ALL_NEW" // Return updated item
  };

  try {
    const data = await dynamodb.update(params).promise();
    //console.log(`Updated quest progress for quest ${questId} for user ${userId}. New progress: ${data.Attributes.progress}`);
    return data.Attributes.progress; // Return updated progress
  } catch (error) {
    console.error("Error updating quest progress:", error);
    throw error;
  }
}

async function deleteUserQuests(userId, questId){
  const params = {
    TableName: "user-quests",
    Key: {
      "user-id": userId,
      "quest-id": questId
    }
  };

  try {
    await dynamodb.delete(params).promise();
    //console.log(`Deleted quest ${questId} for user ${userId}`);
  } catch (error) {
    console.log("Error deleting quest:", error);
    throw error;
  }
}

async function getQuest(questId){
  const params = {
    TableName: "quests",
    KeyConditionExpression: "#qid = :questId",
    ExpressionAttributeNames: {
      "#qid": "quest-id"
    },
    ExpressionAttributeValues: {
      ":questId": questId
    }
  };

  try {
    const data = await dynamodb.query(params).promise();
    const quest = data.Items;
    return quest;
  } catch (error) {
    console.log("Error getting quests:", error);
    throw error;
  }
}

async function handleClaimAction(userId, msg) {
  const userQuests = await getUserQuests(userId);
  //console.log(userQuests);
  const questId1 = "1";
  const questId2 = "2"; 
  const questId3 = "3";
  const quest1 = userQuests.find(quest => quest['quest-id'] === questId1); //sees if user has quest 1
  if (quest1) {
    const progress1 = 1; // Example: Increment progress by 1 for each claim
    await updateUserQuests(userId, questId1, progress1);
    const questData = await getUserQuest(userId, questId1);
    if(questData.progress === 10){
      questData.status = false;
      await deleteUserQuests(userId, questId1); //remove when finished
      const balance = await getUsersBalance(userId);
      await saveUserBalance(userId, balance + 3000);
      msg.reply("You have completed a quest and received 3000 coins!");
    }
    //console.log(`Quest ${questId1} progress updated.`);
  }

  const quest2 = userQuests.find(quest => quest['quest-id'] === questId2);  //sees if user has quest 2
  if (quest2) {
    const progress2 = 1; // Example: Increment progress by 1 for each claim
    await updateUserQuests(userId, questId2, progress2);
    const questData = await getUserQuest(userId, questId2);
    if(questData.progress === 20){
      questData.status = false;
      await deleteUserQuests(userId, questId2); //remove when finished
      await storePack(userId);
      msg.reply("You have completed a quest and received 1 pack!");
    }
    //console.log(`Quest ${questId2} progress updated.`);
  }
  const quest3 = userQuests.find(quest => quest['quest-id'] === questId3); //sees if user has quest 1
  if (quest3) {
    const progress3 = 1; // Example: Increment progress by 1 for each claim
    await updateUserQuests(userId, questId3, progress3);
    const questData = await getUserQuest(userId, questId3);
    if(questData.progress === 30){
      questData.status = false;
      await deleteUserQuests(userId, questId3); //remove when finished
      const user = await getUser(userId);
      const favCard = user["FavCard"];
      const numberOwned = await getHowManyCopiesOwned("user-cards", userId, favCard);
      await changeNumberOwned("user-cards", userId, favCard, numberOwned + 2);
      msg.reply("You have completed a quest and received 2 copies of your favCard!");
    }
    //console.log(`Quest ${questId1} progress updated.`);
  }
}

async function handleDropAction(userId, msg){
  const userQuests = await getUserQuests(userId);
  const questId4 = "4";
  const questId5 = "5"; 
  const questId6 = "6";
  const quest4 = userQuests.find(quest => quest['quest-id'] === questId4); //sees if user has quest 1
  if (quest4) {
    const progress4 = 1; // Example: Increment progress by 1 for each claim
    await updateUserQuests(userId, questId4, progress4);
    const questData = await getUserQuest(userId, questId4);
    if(questData.progress === 5){
      questData.status = false;
      await deleteUserQuests(userId, questId4); //remove when finished
      const balance = await getUsersBalance(userId);
      await saveUserBalance(userId, balance + 3000);
      msg.reply("You have completed a quest and received 3000 coins!");
    }
    //console.log(`Quest ${questId4} progress updated.`);
  }

  const quest5 = userQuests.find(quest => quest['quest-id'] === questId5);  //sees if user has quest 2
  if (quest5) {
    const progress5 = 1; // Example: Increment progress by 1 for each claim
    await updateUserQuests(userId, questId5, progress5);
    const questData = await getUserQuest(userId, questId5);
    if(questData.progress === 15){
      questData.status = false;
      await deleteUserQuests(userId, questId5); //remove when finished
      await storePack(userId);
      msg.reply("You have completed a quest and received 1 pack!");
    }
    //console.log(`Quest ${questId5} progress updated.`);
  }
  const quest6 = userQuests.find(quest => quest['quest-id'] === questId6); //sees if user has quest 1
  if (quest6) {
    const progress6 = 1; // Example: Increment progress by 1 for each claim
    await updateUserQuests(userId, questId6, progress6);
    const questData = await getUserQuest(userId, questId6);
    if(questData.progress === 25){
      questData.status = false;
      await deleteUserQuests(userId, questId6); //remove when finished
      const user = await getUser(userId);
      const favCard = user["FavCard"];
      const numberOwned = await getHowManyCopiesOwned("user-cards", userId, favCard);
      await changeNumberOwned("user-cards", userId, favCard, numberOwned + 3);
      msg.reply("You have completed a quest and received 3 copies of your favCard!");
    }
    //console.log(`Quest ${questId6} progress updated.`);
  }
  
}

async function handleFeedAction(userId, copies, msg) {
  //console.log(copies);
  const userQuests = await getUserQuests(userId);
  //console.log(userQuests);
  const questId7 = "7";
  const questId8 = "8"; 
  const questId9 = "9";
  const quest7 = userQuests.find(quest => quest['quest-id'] === questId7); //sees if user has quest 1
  if (quest7) {
    const progress7 = copies; // Example: Increment progress by 1 for each claim
    await updateUserQuests(userId, questId7, progress7);
    const questData = await getUserQuest(userId, questId7);
    if(questData.progress >= 5){
      questData.status = false;
      await deleteUserQuests(userId, questId7); //remove when finished
      const balance = await getUsersBalance(userId);
      await saveUserBalance(userId, balance + 1500);
      msg.reply("You have completed a quest and received 1500 coins!");
    }
    //console.log(`Quest ${questId7} progress updated.`);
  }

  const quest8 = userQuests.find(quest => quest['quest-id'] === questId8);  //sees if user has quest 2
  if (quest8) {
    //console.log("checked quest right");
    const progress8 = copies; // Example: Increment progress by 1 for each claim
    await updateUserQuests(userId, questId8, progress8);
    const questData = await getUserQuest(userId, questId8);
    if(questData.progress >= 10){
      questData.status = false;
      await deleteUserQuests(userId, questId8); //remove when finished
      const balance = await getUsersBalance(userId);
      await saveUserBalance(userId, balance + 4000);
      msg.reply("You have completed a quest and received 4000 coins!");
    }
    //console.log(`Quest ${questId8} progress updated.`);
  }
  const quest9 = userQuests.find(quest => quest['quest-id'] === questId9); //sees if user has quest 1
  if (quest9) {
    const progress9 = copies; // Example: Increment progress by 1 for each claim
    await updateUserQuests(userId, questId9, progress9);
    const questData = await getUserQuest(userId, questId9);
    if(questData.progress >= 15){
      questData.status = false;
      await deleteUserQuests(userId, questId9); //remove when finished
      await storePack(userId);
      msg.reply("You have completed a quest and received 1 pack!");
    }
    //console.log(`Quest ${questId9} progress updated.`);
  }
}

async function handleWorkAction(userId, msg) {
  const userQuests = await getUserQuests(userId);
  //console.log(userQuests);
  const questId10 = "10";
  const questId11 = "11"; 
  const questId12 = "12";
  const quest10 = userQuests.find(quest => quest['quest-id'] === questId10); //sees if user has quest 1
  if (quest10) {
    const progress10 = 1; // Example: Increment progress by 1 for each claim
    await updateUserQuests(userId, questId10, progress10);
    const questData = await getUserQuest(userId, questId10);
    if(questData.progress === 2){
      questData.status = false;
      await deleteUserQuests(userId, questId10); //remove when finished
      const balance = await getUsersBalance(userId);
      await saveUserBalance(userId, balance + 4000);
      msg.reply("You have completed a quest and received 4000 coins!");
    }
    //console.log(`Quest ${questId10} progress updated.`);
  }

  const quest11 = userQuests.find(quest => quest['quest-id'] === questId11);  //sees if user has quest 2
  if (quest11) {
    const progress11 = 1; // Example: Increment progress by 1 for each claim
    await updateUserQuests(userId, questId11, progress11);
    const questData = await getUserQuest(userId, questId11);
    if(questData.progress === 4){
      questData.status = false;
      await deleteUserQuests(userId, questId11); //remove when finished
      await storePack(userId);
      msg.reply("You have completed a quest and received 1 pack!");
    }
    //console.log(`Quest ${questId11} progress updated.`);
  }
  const quest12 = userQuests.find(quest => quest['quest-id'] === questId12); //sees if user has quest 1
  if (quest12) {
    const progress12 = 1; // Example: Increment progress by 1 for each claim
    await updateUserQuests(userId, questId12, progress12);
    const questData = await getUserQuest(userId, questId12);
    if(questData.progress === 6){
      questData.status = false;
      await deleteUserQuests(userId, questId12); //remove when finished
      const user = await getUser(userId);
      const favCard = user["FavCard"];
      const numberOwned = await getHowManyCopiesOwned("user-cards", userId, favCard);
      await changeNumberOwned("user-cards", userId, favCard, numberOwned + 4);
      msg.reply("You have completed a quest and received 4 copies of your favCard!");
    }
    //console.log(`Quest ${questId12} progress updated.`);
  }
}

function shuffle(array) {
  let currentIndex = array.length, randomIndex;

  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }

  return array;
}

module.exports = {setUserQuests, getUserQuests, createQuestEmbed, deleteUserQuests, updateUserQuests, handleClaimAction, handleDropAction, handleWorkAction, handleFeedAction};
