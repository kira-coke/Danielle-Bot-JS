const {getUsersBalance, saveUserBalance } = require("./userBalanceCmds");
const {checkUserExists} = require("./users");
const { EmbedBuilder } = require("discord.js");

async function payCommand(msg, userId, targetUser, amount ){
  const userExists = await checkUserExists(targetUser.id);
  if (!userExists) {
    msg.channel.send(
        `**This user is not registered yet, please tell them to do .start**`,
    );
    return;
  } else {
    const targetUserId = targetUser.id;

    // Load balances for both users
    const userBalance = await getUsersBalance(userId);
    const targetUserBalance = await getUsersBalance(targetUserId);

    if (userBalance === null) {
        msg.channel.send("No balance found for you.");
        return;
    }

    if (userBalance < amount) {
        msg.channel.send("Insufficient funds.");
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
            `**You have paid ${amount} to ${targetUser.username}**`,
        )
        .setTimestamp();

    msg.channel.send({ embeds: [transactionEmbed] });
  }
}

module.exports = {payCommand};