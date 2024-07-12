const AWS = require('aws-sdk');
const cron = require('node-cron');

const dynamodb = new AWS.DynamoDB.DocumentClient
const { EmbedBuilder, inlineCode, bold, blockQuote, italic, ActionRowBuilder, ButtonBuilder,} = require("discord.js");
const {saveUserBalance, getUsersBalance} = require("./userBalanceCmds.js");
const emote = '<:DB_currency:1257694003638571048>'; 

const milestones = [
    { points: 5000, reward: 1000 },
    { points: 10000, reward: 1000 },
    { points: 15000, reward: 2000 },
    { points: 20000, reward: 2000 },
    { points: 30000, reward: 3000 },
    { points: 35000, reward: 4000 },
    { points: 40000, reward: 5000 },
    { points: 45000, reward: 6000 },
    { points: 50000, reward: 7000 },
    { points: 55000, reward: 8000 },
    { points: 60000, reward: 9000 },
    { points: 65000, reward: 10000 },
    { points: 70000, reward: 12000 },
    { points: 75000, reward: 14000 },
    { points: 80000, reward: 16000 },
    { points: 85000, reward: 18000 },
    { points: 90000, reward: 20000 },
    { points: 95000, reward: 22000 },
    { points: 100000, reward: 25000 },
];

async function createNewCommunity(userId, communityName) {
    try {
        const params = {
            TableName: 'communities',
            Key: { communityName: communityName }
        };
        const existingCommunity = await dynamodb.get(params).promise();

        if (existingCommunity.Item) {
            throw new Error('Community with this name already exists');
        }

        const newCommunityParams = {
            TableName: 'communities',
            Item: {
                communityName: communityName,
                owner: userId,
                memberList: [],
                dgStats: 0,
                assets: 0 // remember from now on assets are just per person, i change the visual part in the embed but its easier to code this way for when members leave/get added half way through
            }
        };

        await dynamodb.put(newCommunityParams).promise();

        console.log(`Community ${communityName} created successfully.`);
        return { success: true };

    } catch (error) {
        console.error('Error creating community:', error.message);
        return { success: false, error: error.message };
    }
}

async function checkIfUserIsInCommunity(userId) {
    try {
        const params = {
            TableName: 'communityMembers',
            Key: {
              'user-id': userId
            }
        };

        const result = await dynamodb.get(params).promise();

        if (!result.Item) {
            return false; // User is not in the community
        }

        return true; // User is in the community
    } catch (error) {
        console.error('Error checking user in community:', error.message);
        throw error;
    }
}

async function getUserCommunity(userId) {
    try {
        const params = {
            TableName: 'communityMembers',
            Key: {
              'user-id': userId
            }
        };

        const result = await dynamodb.get(params).promise();

        if (!result.Item) {
            return false; // User is not in the community
        }

        return result.Item; // User is in the community
    } catch (error) {
        console.error('Error checking user in community:', error.message);
        throw error;
    }
}

async function getCommunityData(communityName){
  try {
    const params = {
        TableName: 'communities',
        Key: {
            communityName: communityName
        }
    };

    const result = await dynamodb.get(params).promise();

    if (!result.Item) {
        return false;
    }

    return result.Item;

  } catch (error) {
    console.error('Error getting community data:', error.message);
    throw error; // Re-throw the error to handle it upstream
  }
}

async function addUserToCommunity(userId, communityName) {
    try {
        const params = {
            TableName: 'communityMembers',
            Item: {
                'user-id': userId,
                communityName: communityName,
                dgStats: 0
            }
        };

        await dynamodb.put(params).promise();

        console.log(`User ${userId} added to community ${communityName} successfully.`);
        return { success: true };

    } catch (error) {
        console.error('Error adding user to community:', error.message);
        return { success: false, error: error.message };
    }
}

async function removeApplicant(userId, communityName) {
    try {
        const params = {
            TableName: 'communities',
            Key: {
                communityName: communityName
            }
        };
        const result = await dynamodb.get(params).promise();

        const applicants = result.Item.applicants || [];

        const updatedApplicants = applicants.filter(applicant => applicant !== userId);

        const updateParams = {
            TableName: 'communities',
            Key: {
                communityName: communityName
            },
            UpdateExpression: 'SET applicants = :applicants',
            ExpressionAttributeValues: {
                ':applicants': updatedApplicants
            },
            ReturnValues: 'UPDATED_NEW'
        };

        await dynamodb.update(updateParams).promise();

        console.log(`Removed user ${userId} from applicants of community ${communityName}.`);
        return { success: true };
    } catch (error) {
        console.error('Error removing applicant:', error.message);
        throw error; // Re-throw the error to handle it upstream
    }
}

async function applyToCommunity(userId, communityName) {
    try {
        const getParams = {
            TableName: 'communities',
            Key: {
                communityName: communityName
            }
        };
        const community = await dynamodb.get(getParams).promise();
        if (!community.Item) {
            throw new Error(`Community ${communityName} does not exist.`);
        }

        const updateParams = {
            TableName: 'communities',
            Key: {
                communityName: communityName
            },
            UpdateExpression: 'SET #applicants = list_append(if_not_exists(#applicants, :empty_list), :applicant)',
            ExpressionAttributeNames: {
                '#applicants': 'applicants'
            },
            ExpressionAttributeValues: {
                ':applicant': [userId],
                ':empty_list': []
            },
            ReturnValues: 'UPDATED_NEW'
        };

        await dynamodb.update(updateParams).promise();

        console.log(`User ${userId} applied to community ${communityName} successfully.`);
        return { success: true };

    } catch (error) {
        console.error('Error applying to community:', error.message);
        return { success: false, error: error.message };
    }
}

async function leaveCommunity(userId) {
    try {
        const params = {
            TableName: 'communityMembers',
            Key: {
                'user-id': userId
            }
        };

        await dynamodb.delete(params).promise();

        console.log(`User ${userId} successfully removed from community.`);
        return { success: true };

    } catch (error) {
        console.error('Error leaving community:', error.message);
        return { success: false, error: error.message };
    }
}

async function updateMemberList(memberId, communityName, action) {
    try {
        const params = {
            TableName: 'communities',
            Key: {
                communityName: communityName
            }
        };

        const result = await dynamodb.get(params).promise();
        let members = result.Item.memberList || [];
      if (action === 'add') {
          members.push(memberId);
      } else if (action === 'remove') {
        const updatedMembers = members.filter(member => member !== memberId);
        members = updatedMembers;
      }
    
        const updateParams = {
            TableName: 'communities',
            Key: {
                communityName: communityName
            },
            UpdateExpression: 'SET memberList = :memberList',
            ExpressionAttributeValues: {
                ':memberList': members
            },
            ReturnValues: 'UPDATED_NEW'
        };

        await dynamodb.update(updateParams).promise();

        console.log(`Added or kicked user ${memberId} of community ${communityName}.`);
        return { success: true };

    } catch (error) {
        console.error('Error adding member to community:', error.message);
        throw error; // Re-throw the error to handle it upstream
    }
}

async function sortCommunityOut(msg, input, userId){
  if(input[0] === "create"){
    const communityName = input[1];
    if(communityName === undefined){
        msg.reply("Please input a community name");
        return;
    }
    const inCom = await checkIfUserIsInCommunity(userId);
    if(inCom === true){
        msg.reply("You are already in a community");
        return;
    }
    try {
      const createResult = await createNewCommunity(userId, communityName);

      if (!createResult.success) {
          msg.reply("Failed to create community. This is likely due to a community with this name already existing, however if you feel this is an error inform me @kira.");
          return;
      }
      await addUserToCommunity(userId, communityName);
      await updateMemberList(userId, communityName, "add");

      const embed = new EmbedBuilder().setColor("#a2d2ff").setTitle(`Created Community:`)
          .setDescription(`**${communityName}**\n\nYou are now the first member in this community!`);

      msg.channel.send({ embeds: [embed] });

    } catch (error) {
      console.error('Error creating or adding user to community:', error.message);
      msg.reply("Failed to create or add user to community. Please try again later.");
    }
  }

  if(input[0] === "apply"){
    const communityName = input[1];
    const inCom = await checkIfUserIsInCommunity(userId);
    if(inCom === true){
        msg.reply("You are already in a community");
        return;
    }
    const community = await getCommunityData(communityName);
    if(community === false){
        msg.reply("This community does not exist");
        return;
    }
    const applicants = community.applicants;
    if(applicants != undefined && applicants.includes(userId)){
        msg.reply("You have already applied to this community.")
        return;
    }
    try{
      await applyToCommunity(userId, communityName);
      const embed = new EmbedBuilder()
          .setColor('#f487b6')
          .setTitle(`Community Application:`)
          .setDescription(`**You have applied to:**\n${inlineCode(communityName)}`);
      msg.channel.send({ embeds: [embed] });
    }catch(error){
      msg.reply(`Failed to apply to community: ` + communityName + `Ensure spelling is correct or it may be this community does not exist`);
      console.log("Error: ", error);
    }
  }
    
  if(input[0] === "withdraw"){
      const communityName = input[1];
      const comData = await getCommunityData(communityName);
      if(comData === false){
          msg.reply("No community with this name exists");
          return;
      }
      const applicants = comData.applicants;
      if(applicants.includes(userId)){
          await removeApplicant(userId, communityName);
          const embed = new EmbedBuilder().setColor("#8c001a").setTitle(`You have withdrawn your application for: :`).setDescription(`**${communityName}**` + "\n\n" + "Do .com join [community name] to join another community");
        msg.channel.send({ embeds: [embed] });
      } else {
          msg.reply("You have not applied to this community.");
      }
  }
  
  if(input[0] === "leave"){
    const communityName = input[1];
    const userCom = await getUserCommunity(userId);
    const com = await getCommunityData(communityName);
    if(com === false){
      msg.reply("No community with this name exists");
      return;
    }
    console.log(com);
    if(communityName === userCom["communityName"]){
      if(com["owner"] === userId){
        msg.reply("You cannot leave a community you own. Do **.com delete** instead to remove this community completely.")
        return;
      }
      await leaveCommunity(userId);
      await updateMemberList(userId, communityName, "remove");
      const embed = new EmbedBuilder().setColor("#8c001a").setTitle(`You have left:`).setDescription(`**${communityName}**` + "\n\n" + "Do .com join [community name] to join another community");
      msg.channel.send({ embeds: [embed] });
    }else{
      msg.reply("You are not in this community. Ensure spelling is correct");
      return;
    }
  }

  /*if(input[0] === "delete"){
    const communityName = input[1];
    const com = await getCommunityData(communityName);
    if(com === false){
      msg.reply("No community with this name exists");
      return;
    }
    if(com["owner"] === userId){
      //stuff to do with deleting the community
    }else{
      msg.reply("You are not the owner of this community and do not have the perms to delete it");
      return;
    }
  }*/
  
  if(input[0] === "v" || input[0] === "view"){
    const communityName = input[1];
    const com = await getCommunityData(communityName);
    if(com === false){
      msg.reply("No community with this name exists");
      return;
    }
    const embed = communityEmbed(com);
    await msg.channel.send({ embeds: [embed] });
  }
  
  /*if(input[0] === "announce"){
    const communityName = input[1];
    const com = await getCommunityData(communityName);
    if(com === false){
      msg.reply("No community with this name exists");
      return;
    }
    if(com["owner"] === userId){
      const message = input.slice(1).join(" ");
      //do the announcement here
    }else{
      msg.reply("You are not the owner of this community and do not have the perms to send an annoucement");
      return;
    }
  }*/

  if(input[0] === "applicants"){
    const communityName = input[1];
    if(communityName === undefined){
      msg.reply("Please input a community to check");
      return;
    }
    
    const com = await getCommunityData(communityName);
    if(com === false){
      msg.reply("No community with this name exists");
      return;
    }
    if(com["owner"] === userId){
      const applicants = com.applicants || [];
      const embed = new EmbedBuilder()
          .setColor('#ffb2e6')
          .setTitle(`Applicants for Community: ${communityName}`);

      if (applicants.length > 0) {
          const applicantList = applicants.map(applicant => `- <@${applicant}> - ${applicant}`).join('\n');
          embed.setDescription(`**Applicants:**\n${applicantList}`);
      } else {
          embed.setDescription(bold("No applicants currently"));
      }
      msg.channel.send({ embeds: [embed] });
    }else{
      msg.reply("You are not the owner of this community and do not have the perms view applicants");
      return;
    }
  }

  if(input[0] === "accept" || input[0] === "reject"){
    const applicant = input[1];
    const userData = await getUserCommunity(userId);
    const userCom = userData["communityName"];
    const com = await getCommunityData(userCom);
    if(com === false){
      msg.reply("No community with this name exists");
      return;
    }
    const applicants = com.applicants || [];
    if(com["owner"] != userId){
      msg.reply("You are not the owner of this community and do not have the perms to accept applicants");
      return;
    }
    if (!applicants.includes(applicant)) {
        msg.reply(`User <@${applicant}> is not an applicant for the community. Ensure you have given their **id** not username etc.`);
        return;
    }
    if(input[0] === "accept"){
      const memNumber = com.memberList.length;
       
      if(memNumber >= 20){
        const embed = new EmbedBuilder()
            .setColor('#af4d98')
            .setTitle(`You are at max members in your community.`)
        msg.channel.send({ embeds: [embed] });
          return;
      }
      const inCom = await checkIfUserIsInCommunity(applicant);
      if(inCom === true){
          msg.reply("This user is already in a community. Either tell them to .withdraw or reject their application.");
          return;
      }
      await addUserToCommunity(applicant, userCom);
      await updateMemberList(applicant, userCom, "add");
      const embed = new EmbedBuilder()
          .setColor('#cce8cc')
          .setTitle(`Applicants accepted!`)
          .setDescription(`**You have accepted:**\n${inlineCode(applicant)}`);
      msg.channel.send({ embeds: [embed] });
    }else{
      const embed = new EmbedBuilder()
          .setColor('#31081f')
          .setTitle(`Applicants rejected.`)
          .setDescription(`**You have rejected:**\n${inlineCode(applicant)}`);
      msg.channel.send({ embeds: [embed] });
    }
    await removeApplicant(applicant, userCom);
  }
  
  if(input[0] === "kick"){
    const member = input[1];
    const memberData = await getUserCommunity(member);
    if (memberData === false) {
        msg.reply(
            "This user is not in a community, dont be mean and try to kick them from something they dont have :(",
        );
        return;
    }
    const memberCom = memberData["communityName"];
    const com = await getCommunityData(memberCom); //member community data
    if (com["owner"] !== userId) {
        msg.reply(
            "You are not the owner of this community and do not have the perms to kick members",
        );
        return;
    }
    if (com["owner"] === userId) {
        msg.reply("You cannot kick yourself silly!");
        return;
    }
      
    await updateMemberList(member, memberCom, "remove");
    await leaveCommunity(member, memberCom);
    const embed = new EmbedBuilder()
        .setColor('#31081f')
        .setTitle(`Member kicked.`)
        .setDescription(`**You have kicked:**\n${inlineCode(member)}`);
    msg.channel.send({ embeds: [embed] });
  }
  
  if(input[0] === "leaderboard" || input[0] === "lb"){
    const communityName = input[1];
    let comData = "";
    try{
        comData = await getCommunityData(communityName);
    }catch(error){
        console.log("No community given");
        return;
    }
    if(comData === false){
        msg.reply("This community does not exist.");
        return;
    }
    const members = comData.memberList;
      const memberDataPromises = members.map(async memberId => {
          const memberData = await getUserCommunity(memberId); 
          return {
              userId: memberId,
              dgStats: memberData.dgStats || 0
          };
      });
      const membersData = await Promise.all(memberDataPromises);
      membersData.sort((a, b) => b.dgStats - a.dgStats);
      let currentPage = 0;
      const itemsPerPage = 10;
      const totalPages = Math.ceil(membersData.length / itemsPerPage);
      const generateLeaderboardEmbed = (page) => {
          const start = page * itemsPerPage;
          const end = start + itemsPerPage;
          const currentMembers = membersData.slice(start, end);

          const embed = new EmbedBuilder()
              .setColor("#a2d2ff")
              .setTitle(`Leaderboard for Community: ${inlineCode(communityName)}`)
              .setDescription("Here are the top members based on their dgStats:");

          currentMembers.forEach((member, index) => {
              embed.addFields(
                  { name: ` `, value: `${inlineCode(String("#" + (start + index + 1)))}. <@${member.userId}> - Contribution to community dungeon stats: ${inlineCode(member.dgStats)}`, inline: false }
              );
          });
          return embed;
      };

      const row = new ActionRowBuilder()
          .addComponents(
              new ButtonBuilder()
                  .setCustomId('previous')
                  .setLabel('Previous')
                  .setStyle("Secondary")
                  .setDisabled(currentPage === 0),
              new ButtonBuilder()
                  .setCustomId('next')
                  .setLabel('Next')
                  .setStyle("Secondary")
                  .setDisabled(currentPage === totalPages - 1)
          );

      const embedMessage = await msg.channel.send({ embeds: [generateLeaderboardEmbed(currentPage)], components: [row] });

      const collector = embedMessage.createMessageComponentCollector({ time: 60000 });
      collector.on('collect', async interaction => {
          if (interaction.customId === 'previous') {
              currentPage--;
          } else if (interaction.customId === 'next') {
              currentPage++;
          }

          await interaction.update({
              embeds: [generateLeaderboardEmbed(currentPage)],
              components: [
                  new ActionRowBuilder()
                      .addComponents(
                          new ButtonBuilder()
                              .setCustomId('previous')
                              .setLabel('Previous')
                              .setStyle("Secondary")
                              .setDisabled(currentPage === 0),
                          new ButtonBuilder()
                              .setCustomId('next')
                              .setLabel('Next')
                              .setStyle("Secondary")
                              .setDisabled(currentPage === totalPages - 1)
                      )
              ]
          });
      });

      collector.on('end', () => {
          embedMessage.edit({ components: [] });
      });
  }
  
  if(input[0] === undefined){
    const userInCom = await checkIfUserIsInCommunity(msg.author.id);
    if(userInCom === false){
        console.log("User is not in a community");
        return;
    }
    const userCom = await getUserCommunity(msg.author.id);
    const comData = await getCommunityData(userCom["communityName"]);
    const embed = communityEmbed(comData);
    await msg.channel.send({ embeds: [embed] });
  }

}

async function updateComDgStats(userId, amount){
  const userInCom = await checkIfUserIsInCommunity(userId);
  if(userInCom === false){
      console.log("User is not in a community");
      return;
  }
  try{
    const userData = await getUserCommunity(userId);
    const userCom = userData["communityName"];
    const comData = await getCommunityData(userCom);
    let dgStats = comData["dgStats"];
    dgStats += amount;
    const updateParams = {
      TableName: 'communities',
      Key: {
          communityName: userCom
      },
      UpdateExpression: 'SET dgStats = :dgStats',
      ExpressionAttributeValues: {
          ':dgStats': dgStats
      },
      ReturnValues: 'UPDATED_NEW'
    };
    await dynamodb.update(updateParams).promise();
    console.log(`Successfully updated dgStats for community ${userCom}. New value: ${dgStats}`);
    await checkDgProgress(userCom);
    //call above every time stats are updated to see if a milestone has been reached
  } catch (error) {
      console.error('Error updating dgStats:', error.message);
      throw error;
  }
}

async function updateUserDgStats(userId, amount){
  const userInCom = await checkIfUserIsInCommunity(userId);
  if(userInCom === false){
      console.log("User is not in a community");
      return;
  }
  try{
    const userData = await getUserCommunity(userId);
    let dgStats = userData["dgStats"];
    dgStats += amount;
    const updateParams = {
      TableName: 'communityMembers',
      Key: {
          'user-id': userId
      },
      UpdateExpression: 'SET dgStats = :dgStats',
      ExpressionAttributeValues: {
          ':dgStats': dgStats
      },
      ReturnValues: 'UPDATED_NEW'
    };
    await dynamodb.update(updateParams).promise();
    console.log(`Successfully updated dgStats for user ${userId}. New value: ${dgStats}`);
  } catch (error) {
      console.error('Error updating dgStats:', error.message);
      throw error;
  }
}

async function checkDgProgress(communityName){
    const comData = await getCommunityData(communityName);
    let totalAmount = 0;

    for (const milestone of milestones) {
        if (comData.dgStats >= milestone.points) {
            totalAmount +=  milestone.reward;
        }
    }
    if (totalAmount > 0) {
        const newAssets = totalAmount;
        await updateComAssets(communityName, newAssets);
    }
}

async function updateComAssets(communityName, newAssets) {
    const params = {
        TableName: 'communities',
        Key: {
            communityName: communityName
        },
        UpdateExpression: 'SET assets = :assets',
        ExpressionAttributeValues: {
            ':assets': newAssets
        },
        ReturnValues: 'UPDATED_NEW'
    };

    await dynamodb.update(params).promise();
}

async function getAllCommunityNames() {
    const params = {
        TableName: 'communities',
        ProjectionExpression: 'communityName'
    };

    const result = await dynamodb.scan(params).promise();
    return result.Items.map(item => item.communityName);
}

async function awardAmount(userId, amount){
  const userBalance = await getUsersBalance(userId);
  const newBalance = userBalance + amount;
  await saveUserBalance(userId, newBalance);
}

cron.schedule('0 0 * * MON', async () => {//'0 0 * * MON',
    console.log('Running weekly rewards distribution...');
    try {
        const communityNames = await getAllCommunityNames();

        for (const communityName of communityNames) {
            await checkDgProgress(communityName);
            const comData = await getCommunityData(communityName);
            const members = comData.memberList;
            console.log(comData);
            console.log(members);
            
            if (comData.assets!=0) { 
                for (const memberId of members) {
                    //console.log("Member id: ", memberId, "Amount being given: ", comData.assets)
                    await awardAmount(memberId, comData.assets);
                }
            }
        }
        console.log('Rewards distribution complete.');
    } catch (error) {
        console.error('Error during rewards distribution:', error.message);
    }
}, {
    timezone: 'Europe/London' // Set to BST
});

function communityEmbed(com){
  const memberCount = com.memberList.length;
  const memberCountPercentage = (memberCount / 20) * 100;
  const embed = new EmbedBuilder()
      .setColor('#ffb3c6')
      .setTitle(`Community Data for: ${inlineCode(com["communityName"])}`)
      .addFields({name: 'Owner', value:`<@${com["owner"]}>`, inline: true})
      .addFields({name: 'Member Count', value:`${inlineCode(memberCount + "/20")} (${memberCountPercentage}%)`, inline: true})
      .addFields({name: 'Current assets', value:`${inlineCode(com.assets*memberCount)}${emote}`, inline: true})
      .addFields({name: ' ', value: ' '})
      .addFields({name: 'Current member paycheck', value:`${inlineCode(com.assets)}${emote} \n ${italic("This will be added to your balance every week on Monday at 0:00 BST")}`, inline: true})
      .addFields({name: ' ', value: ' '})
      .addFields({name: 'Current community dungeon stats', value:`${inlineCode(com.dgStats)}`, inline: true})

  if (com.memberList && com.memberList.length > 0) {
      const memberList = com.memberList.map(member => `<@${member}>`).join(' ');
      embed.addFields({name: ' ', value: ' '});
      embed.addFields({name: 'Members', value: blockQuote(memberList)});
  } else {
      embed.addFields({name: 'Members', value: 'No members yet'});
  }
  return embed;
}


module.exports = {sortCommunityOut, updateUserDgStats, updateComDgStats };