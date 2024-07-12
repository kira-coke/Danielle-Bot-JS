const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient

async function eventRoll(userId, msg){
  //get random rarity card 3 from table, then send to user
  //remove 1 even roll from user
  //add card to user inv etc
  //if they owned, add to copiues owned, if not add plain item
}

module.exports = {eventRoll};