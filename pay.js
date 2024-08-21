const {getUsersBalance, saveUserBalance } = require("./userBalanceCmds");
const {checkUserExists} = require("./users");
const { EmbedBuilder } = require("discord.js");
const emote = '<:DB_currency:1257694003638571048>'; 

async function payCommand(msg, userId, targetUser, amount ){
  const userExists = await checkUserExists(targetUser.id);
  if (!userExists) {
    msg.reply(
        `**This user is not registered yet, please tell them to do .start**`,
    );
    return;
  } else {
    const targetUserId = targetUser.id;

    // Load balances for both users
    const userBalance = await getUsersBalance(userId);
      console.log(userBalance);
    const targetUserBalance = await getUsersBalance(targetUserId);

    if (userBalance === null) {
        msg.reply("No balance found for you.");
        return;
    }

    if (userBalance < amount) {
        msg.reply("Insufficient funds.");
        return;
    }

    // Update balances
    await saveUserBalance(userId, userBalance - amount);
    await saveUserBalance(
        targetUserId,
        (targetUserBalance || 0) + amount,
    );

    const transactionEmbed = new EmbedBuilder()
        .setColor("#90ee90")
        .setTitle("Currency Transaction")
        .setDescription(
            `**You have paid ${amount}${emote} to ${targetUser.username}**`,
        )
        .setTimestamp();

    msg.channel.send({ embeds: [transactionEmbed] });
  }
}

module.exports = {payCommand};