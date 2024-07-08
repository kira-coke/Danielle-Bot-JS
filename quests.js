const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient
const {EmbedBuilder, inlineCode} = require("discord.js");
const {saveUserBalance, getUsersBalance} = require("./userBalanceCmds");

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
    console.log(`Assigned quest ${questId} to user ${userId}`);
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
    console.log(`Updated quest progress for quest ${questId} for user ${userId}. New progress: ${data.Attributes.progress}`);
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
    console.log(`Deleted quest ${questId} for user ${userId}`);
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

async function handleClaimAction(userId) {
  const userQuests = await getUserQuests(userId);
  console.log(userQuests);
  const questId1 = "1";
  const questId2 = "2"; 
  const quest1 = userQuests.find(quest => quest['quest-id'] === questId1); //sees if user has quest 1
  if (quest1) {
    const progress1 = 1; // Example: Increment progress by 1 for each claim
    await updateUserQuests(userId, questId1, progress1);
    const questData = await getUserQuest(userId, questId1);
    if(questData.progress === 10){
      questData.status = false;
      await deleteUserQuests(userId, questId1); //remove when finished
      const balance = await getUsersBalance(userId);
      await saveUserBalance(userId, balance + 2000);
    }
    console.log(`Quest ${questId1} progress updated.`);
  }

  const quest2 = userQuests.find(quest => quest['quest-id'] === questId2);  //sees if user has quest 2
  if (quest2) {
    const progress2 = 1; // Example: Increment progress by 1 for each claim
    await updateUserQuests(userId, questId2, progress2);
    const questData = await getUserQuest(userId, questId2);
    if(questData.progress === 20){
      questData.status = false;
      await deleteUserQuests(userId, questId2); //remove when finished
      const balance = await getUsersBalance(userId);
      await saveUserBalance(userId, balance + 5000);
    }
    console.log(`Quest ${questId2} progress updated.`);
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

module.exports = {setUserQuests, getUserQuests, createQuestEmbed, deleteUserQuests, updateUserQuests, handleClaimAction};
