const {getUser} = require("./users.js");
const {EmbedBuilder } = require("discord.js");
const {getCardFromTable} = require("./cards");
const Discord = require("discord.js");

async function getUserProfile(msg, userId){
    try{
         const user = await msg.client.users.fetch(userId);
          const userData = await getUser(userId);
          const userFavcard = await getCardFromTable(
              "cards",
              userData["FavCard"],
          );
          const favCardUrl = userFavcard["cardUrl"];
          if(String(userData["Description"]).length === 0){
            String(userData["Description"] = Discord.inlineCode("No bio set"));
          }
          const embed = new EmbedBuilder()
              .setColor("#fffac2") //should be able to change colour
              .setTitle(user.username + "'s Profile")
              .setDescription(userData["Description"]) //should be able to change description
              .addFields({
                  name:
                      "**Balance: **" +
                      Discord.inlineCode(
                          String(userData["Balance"])
                              .toString()
                              .replace(/\B(?=(\d{3})+(?!\d))/g, ","),
                      ),
                  value: " ",
                  inline: true,
              })
              .addFields(
                  {
                      name: "Looking for: ",
                      value: Discord.inlineCode(userData["LookingFor"]),
                      inline: false,
                  }, // You can set inline to true if you want the field to display inline.
              )
              .addFields({
                  name:
                      "**Favourite Card: **" +
                      Discord.inlineCode(userFavcard["card-id"]),
                  value: " ",
                  inline: false,
              })
              .addFields({
                  name:
                      "**Card Count: **" +
                      Discord.inlineCode(String(userData["cardCount"])),
                  value: " ",
                  inline: false,
              })
              .addFields({
                    name:
                        "**Total EXP: **" +
                        Discord.inlineCode(String(userData.TotalExp)),
                    value: " ",
                    inline: false,
                })
              .setFooter({
                  text: msg.author.tag,
                  iconURL: msg.author.displayAvatarURL({ dynamic: true }),
              })
              .setImage(favCardUrl) //they should be able to change this - change card etc
              .setTimestamp();
          msg.reply({ embeds: [embed] });
        
    }catch(error){
        console.log("something went wrong here");
        console.log(error);
    }
 
}

module.exports = {getUserProfile};

