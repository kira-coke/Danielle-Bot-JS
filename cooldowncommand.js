const {getUserCooldown} = require("./cooldowns");
const Discord = require("discord.js");
const { EmbedBuilder } = require("discord.js");

async function getCooldowns(userId, msg){
  const authorTag = `${msg.author.username}#${msg.author.discriminator}`;
  let dropCd = await getUserCooldown(userId, "d");
  let claimCd = await getUserCooldown(userId, "c");
  let workCd = await getUserCooldown(userId, "w");
  let dailyCd = await getUserCooldown(userId, "daily");
  let dgCd = await getUserCooldown(userId, "dg");
  if(dropCd === '0m 0s'){
      dropCd = 'Available';
  }
  if(claimCd === '0m 0s'){
      claimCd = 'Available';
  }
  if(workCd === '0m 0s'){
      workCd = 'Available';
  }
  if(dailyCd === '0m 0s'){
      dailyCd = 'Available';
  }
  if(dgCd === '0m 0s'){
      dgCd = 'Available';
  }

  // Construct the embed
  const cooldownEmbed = new EmbedBuilder()
      .setColor('#ffcad4')
      .setDescription(`**${authorTag}` + `'s Cooldowns**`)
      .addFields(
          { name: `Claim: ` + Discord.inlineCode(claimCd), value: " "},
          { name: `Drop: ` + Discord.inlineCode(dropCd), value: " "},
          { name: `Work: ` + Discord.inlineCode(workCd), value: " "},
          { name: `Dungeon: ` + Discord.inlineCode(dgCd), value: " "}, 
          { name: `Daily: ` + Discord.inlineCode(dailyCd), value: " "}
      )
      .setTimestamp();

    msg.reply({
        embeds: [cooldownEmbed],
        allowedMentions: { repliedUser: false },
    });
}

module.exports = {getCooldowns};