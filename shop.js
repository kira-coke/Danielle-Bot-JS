const { EmbedBuilder, inlineCode, ActionRowBuilder, ButtonBuilder, bold } = require('discord.js');
const {getUser} = require("./users");
const {getRandomDynamoDBItem, getUserCard, getWeightedCard} = require("./cards");


const shopItems = [
    {
        id: '5_pack',
        name: "Card Pack 5",
        image: 'https://danielle-bot-images.s3.eu-west-2.amazonaws.com/assets/CARDPACK.png',
        price: 10000,
    },
];
const priceWithNumbers = numberWithCommas(shopItems[0].price);

function openShop(msg) {
    const embed = new EmbedBuilder()
        .setTitle('Dani Bot Shop')
        .setDescription("Do **.shop buy [item-id]** to purchase! ")
        .setColor('#fb6f92');

    shopItems.forEach(item => {
          embed.addFields(
              {
                  name: `[1] ${item.name}`,
                  value: '**Price: **' + inlineCode(String(priceWithNumbers)),
                  inline: false,
              },
          )
    });
    msg.channel.send({ embeds: [embed] });
}

function purchaseItem(msg, itemId, userId) {
    const item = shopItems.find(i => i.id === itemId);

    if (!item) {
        return msg.channel.send('Item not found!');
    }

    const embed = new EmbedBuilder()
        .setTitle(`Purchased ${item.name}`)
        .setDescription(`Price: ${inlineCode(String(priceWithNumbers))} coins`)
        .setImage(item.image)
        .setColor('#efcfe3');

    const customId = `open_pack_${msg.id}_${itemId}`;

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(customId)
                .setLabel('Open Pack')
                .setStyle('Secondary')
        );

    msg.channel.send({ embeds: [embed], components: [row] });
    const filter = interaction => interaction.customId === customId && interaction.user.id === msg.author.id;

    
    const collector = msg.channel.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async interaction => {
        await interaction.deferUpdate();
        if (interaction.customId === customId) {;
            const disabledRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(customId)
                        .setLabel('Open Pack')
                        .setStyle('Secondary')
                        .setDisabled(true)
                );
            await interaction.message.edit({ components: [disabledRow] });
            await packOpen(msg, userId); 
            collector.stop(); 
        }
    });
    collector.on('end', async collected => {
        if (collected.size === 0) {
            const disabledRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(customId)
                        .setLabel('Open Pack')
                        .setStyle('Secondary')
                        .setDisabled(true)
                );
            await interaction.message.edit({ components: [disabledRow] });
            collector.stop(); 
        }
    });
}

async function packOpen(msg, userId){
    try{
        const user = await getUser(userId);
        const userFavCard = user["FavCard"];
        const userFavCardData = await getUserCard("user-cards",userId,userFavCard);
        const cardData = userFavCardData[0];
        const amount = 5;
        const cardPromises = [];

        for (let i = 0; i < amount; i++) {
            if (cardData.tier >= 2) {
                cardPromises.push(getWeightedCard(userId));
            } else {
                cardPromises.push(getRandomDynamoDBItem("cards"));
            }
        }
        // Execute all card fetching operations concurrently
        const cards = await Promise.all(cardPromises);
        //add all the cards to users numbersOwned and total card count
        const embed = new EmbedBuilder()
            .setTitle('Pack Opened')
            .setDescription('You have recieved:')
            .setColor('#8093f1')
            .addFields(cards.map(card => ({ name: " ", value: `${inlineCode(String(card["card-id"]))} ${bold(card["GroupName"])} ${bold(card["GroupMember"])} (${card["Theme"]})`, inline: false })));

        msg.channel.send({ embeds: [embed] });
        
    } catch (error) {
        console.error('Error opening pack:', error);
        msg.channel.send('An error occurred while opening the pack. Please try again later.');
    }
}


function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

module.exports = {openShop, purchaseItem};