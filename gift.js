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
          msg.channel.send("**Please enter a valid card id**");
          return;
      }
      if (!userExists) {
          msg.channel.send(
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
              msg.channel.send(
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
                if(await checkIfUserOwnsCard(secondTableName, targetUserId, cardIDToGift)===0){
                  console.log("User does not own card");
                  //code for adding the one copy to their inv instead
                  const item = {
                        "user-id": targetUserId, //primary key
                        "card-id": cardIDToGift, //secondary key
                        "copies-owned": 1,
                        exp: 0,
                        level: 0,
                        upgradable: false,
                  }
                  console.log(item);
                  await writeToDynamoDB(secondTableName, item)
                  .then(() => {
                      console.log(
                          "Successfully wrote first instance of this item to DynamoDB first table",
                      );
                  })
                  .catch((error) => {
                      console.error("Error:", error);
                  });
                }else{
                  const currentOwnedByUser2 =
                    await getHowManyCopiesOwned(
                        secondTableName,
                        targetUserId,
                        cardIDToGift,
                    );
                   if(currentOwnedByUser2 >= 1){
                     await changeNumberOwned(
                         secondTableName,
                         targetUserId,
                         cardIDToGift,
                         (parseInt(currentOwnedByUser2) +
                             parseInt(numberOfCopiesToGive)), //to account for the first copy being added
                     );
                   }
                  
                }
                  if (currentOwnedByUser1 === 1) {
                      msg.reply(
                          "**You must own more than 1 copy to gift duplicates**",
                      );
                      return;
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