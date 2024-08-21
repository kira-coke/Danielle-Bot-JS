const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB.DocumentClient
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, inlineCode, bold} = require("discord.js");

async function getAllUserData() {
    const params = {
        TableName: 'Dani-bot-playerbase'
    };

    try {
        const data = await dynamodb.scan(params).promise();
        return data.Items; // This contains an array of all items in the table
    } catch (error) {
        console.error("Error fetching data from DynamoDB", error);
        throw new Error('Error fetching data from DynamoDB');
    }
}

function createEmbed(msg, data, page, perPage, totalPages, title, attributeName) {
    const embed = new EmbedBuilder()
        .setTitle(`${title}                                                       (Page ${page + 1}/${totalPages})`)
        .setColor('#fae3c6')
        .setFooter({
            text: msg.author.tag,
            iconURL: msg.author.displayAvatarURL({
                dynamic: true,
            }),
        });

    const start = page * perPage;
    const end = start + perPage;
    const pageData = data.slice(start, end);

    pageData.forEach((user, index) => {
        const userId = user['user-id'];
        const mention = `<@${userId}>`;
        const numberWithCommans = numberWithCommas(user[attributeName]);
        if((start+index+1) === 1){
            embed.addFields(
                { name: " ", value: `:crown: ${mention} - ${bold(attributeName)}: ${inlineCode(numberWithCommans)}`, inline: false }
            );
        }else{
            embed.addFields(
                { name: " ", value: `${inlineCode(String("#"+ (start + index + 1)))} ${mention} - ${bold(attributeName)}: ${inlineCode(numberWithCommans)}`, inline: false }
            );
        }
    });
    return embed;
}

async function displayLeaderboard(msg, leaderboardType){
    try{
        const perPage = 10;
        const userData = await getAllUserData();
        if (!userData || userData.length === 0) {
            message.channel.send('No user data found.');
            return;
        }
        let sortedData;
        let attributeName;

        if (leaderboardType === 'exp') {
            sortedData = sortUserData(userData, 'TotalExp');
            attributeName = 'TotalExp';
        } else if (leaderboardType === 'cards') {
            sortedData = sortUserData(userData, 'cardCount');
            attributeName = 'cardCount';
        } else if (leaderboardType === 'bal' || leaderboardType === 'balance') {
            leaderboardType = `balance`;
            sortedData = sortUserData(userData, 'Balance');
            attributeName = 'Balance';
        } else{
            msg.channel.send('Please input a valid field from the following: **exp, cards, bal/balance**');
            return;
        }

        let currentPage = 0;
        const totalPages = Math.ceil(sortedData.length / perPage);

        const embedMessage = await msg.channel.send({
            embeds: [createEmbed(msg, sortedData, currentPage, perPage, totalPages, `${leaderboardType.charAt(0).toUpperCase() + leaderboardType.slice(1)} Leaderboard`, attributeName)],
            components: [createPaginationRow(currentPage, totalPages)]
        });

        const collector = embedMessage.createMessageComponentCollector({ time: 60000 });

        collector.on('collect', interaction => {
            if (!interaction.isButton()) return;

            if (interaction.customId === 'prev_page') {
                if (currentPage > 0) {
                    currentPage--;
                    embedMessage.edit({
                        embeds: [createEmbed(msg, sortedData, currentPage, perPage, totalPages, `${leaderboardType.charAt(0).toUpperCase() + leaderboardType.slice(1)} Leaderboard`, attributeName)],
                        components: [createPaginationRow(currentPage, totalPages)]
                    });
                }
            } else if (interaction.customId === 'next_page') {
                if (currentPage < totalPages - 1) {
                    currentPage++;
                    embedMessage.edit({
                        embeds: [createEmbed(msg, sortedData, currentPage, perPage, totalPages, `${leaderboardType.charAt(0).toUpperCase() + leaderboardType.slice(1)} Leaderboard`, attributeName)],
                        components: [createPaginationRow(currentPage, totalPages)]
                    });
                }
            }
            interaction.deferUpdate();
        });

        collector.on('end', () => {
            embedMessage.edit({ components: [] });
        });
        
    }catch(error){
        console.log("omething went wrong trying to display a leaderboard");
        console.log("Error: ", error);
    }
}

function createPaginationRow(currentPage, totalPages) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('prev_page')
            .setLabel('Previous')
            .setStyle("Secondary")
            .setDisabled(currentPage === 0),
        new ButtonBuilder()
            .setCustomId('next_page')
            .setLabel('Next')
            .setStyle("Secondary")
            .setDisabled(currentPage === totalPages - 1)
    );
}

function sortUserData(userData, attribute) {
    return userData.sort((a, b) => b[attribute] - a[attribute]);
}
function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

module.exports = {displayLeaderboard};