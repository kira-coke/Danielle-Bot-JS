const {getHowManyCopiesOwned,getCardFromTable,changeNumberOwned, checkIfUserOwnsCard, writeToDynamoDB} = require("./cards");
const {checkUserExists} = require("./users.js");
const { EmbedBuilder } = require("discord.js");
const Discord = require("discord.js");

async function giftcards(msg, cardIDToGift, userId, targetUser, numberOfCopiesToGive){
  const userExists = await checkUserExists(targetUser.id);
  (async () => {
      const targetUserId = targetUser.id;
      const tableName = "cards";
      try {
          card = await getCardFromTable(tableName, cardIDToGift);
      } catch (error) {
          console.log(
              "Couldnt find item with this card:" + cardIDToGift,
          );
          msg.reply("**Please enter a valid card id**");
          return;
      }
      if (!userExists) {
          msg.reply(
              `**This user is not registered yet, please tell them to do .start**`,
          );
          return;
      }
      try {
          const secondTableName = "user-cards";
          const numberOfCopies = await getHowManyCopiesOwned(
              secondTableName,
              userId,
              cardIDToGift,
          );
          if (
              numberOfCopies == 0 ||
              numberOfCopies < numberOfCopiesToGive
          ) {
              msg.reply(
                  "**You do not own enough copies of this card to gift**",
              );
              return;
          } else {
              try {
                  const currentOwnedByUser1 =
                      await getHowManyCopiesOwned(
                          secondTableName,
                          userId,
                          cardIDToGift,
                      );
                  if (currentOwnedByUser1 === 1) {
                      msg.reply(
                          "**You must own more than 1 copy to gift duplicates**",
                      );
                      return;
                  }
                let userOwnes = true;
                if(await checkIfUserOwnsCard(secondTableName, targetUserId, cardIDToGift)===0){
                  userOwnes = false;
                  console.log("User does not own card");
                  //code for adding the one copy to their inv instead
                  const item = {
                        "user-id": targetUserId, //primary key
                        "card-id": cardIDToGift, //secondary key
                        "copies-owned": 1,
                        exp: 0,
                        level: 0,
                        upgradable: false,
                        tier: 1,
                        totalExp: 0
                  }
                  await writeToDynamoDB(secondTableName, item)
                  .catch((error) => {
                      console.error("Error:", error);
                  });
                }
                  const currentOwnedByUser2 =
                    await getHowManyCopiesOwned(
                        secondTableName,
                        targetUserId,
                        cardIDToGift,
                    );
                  if((currentOwnedByUser2 === 1) && (numberOfCopiesToGive === 1)){
                      if(userOwnes === false){
                          console.log("Correctly added only 1 copy to user");
                      }else{
                            await changeNumberOwned(
                                 secondTableName,
                                 targetUserId,
                                 cardIDToGift,
                                 (parseInt(currentOwnedByUser2) +
                                     parseInt(numberOfCopiesToGive)), 
                             );
                      }
                  }else if((currentOwnedByUser2 === 1) && (numberOfCopiesToGive > 1) ){
                      if(userOwnes === false){
                             await changeNumberOwned(
                                 secondTableName,
                                 targetUserId,
                                 cardIDToGift,
                                 (parseInt(currentOwnedByUser2) +
                                     parseInt(numberOfCopiesToGive - 1)), //to account for the first copy being added
                             );
                      }else{
                          await changeNumberOwned(
                              secondTableName,
                              targetUserId,
                              cardIDToGift,
                              (parseInt(currentOwnedByUser2) +
                                  parseInt(numberOfCopiesToGive)), //add to total count as they havnt had one copy added yet
                          );
                      }
                  }else{
                       await changeNumberOwned(
                           secondTableName,
                           targetUserId,
                           cardIDToGift,
                           (parseInt(currentOwnedByUser2) +
                               parseInt(numberOfCopiesToGive)), //to account for the first copy being added
                       );
                  }
                  await changeNumberOwned(
                      secondTableName,
                      userId,
                      cardIDToGift,
                      parseInt(currentOwnedByUser1) -
                          numberOfCopiesToGive,
                  );
                  //call the changeNumberOwned function here twiocer, once for msg user once for target user
                  //embed informing uve given x amount to targetUser
                  const embed = new EmbedBuilder()
                      .setColor("#57F287")
                      .setDescription(
                          `You have gifted **${Discord.inlineCode(numberOfCopiesToGive)} ${cardIDToGift} to ${targetUser.displayName}**`,
                      )
                      .addFields({
                          name: "You now have: ",
                          value: Discord.inlineCode(
                              String(
                                  currentOwnedByUser1 -
                                      numberOfCopiesToGive,
                              ),
                          ),
                          inline: true,
                      })
                      .setFooter({
                          text: msg.author.tag,
                          iconURL: msg.author.displayAvatarURL({
                              dynamic: true,
                          }),
                      })
                      .setTimestamp();
                  msg.reply({
                      embeds: [embed],
                      allowedMentions: { repliedUser: false },
                  });
              } catch (error) {
                  console.log("Failed to gift the cards");
                  console.log("Error:" + error);
              }
          }
      } catch (error) {
          console.log(
              "Couldn't find item in table user-cards with this card id: " +
                  cardIDToGift,
          );
      }
  })();
  
}

module.exports = {giftcards};