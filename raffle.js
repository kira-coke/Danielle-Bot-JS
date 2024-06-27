const prizes = ['1', '2'];
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, inlineCode} = require("discord.js");
const {getRandomDynamoDBItem, changeNumberOwned, addToTotalCardCount, checkIfUserOwnsCard, writeToDynamoDB, getHowManyCopiesOwned} = require("./cards");
const {getUsersBalance, saveUserBalance} = require("./userBalanceCmds");
const raffleEntries = new Set();

async function forceRaffle(channel, client){
    raffleEntries.clear();
    raffle(channel, client);
}

async function raffle(channel, client){
  const prize = prizes[Math.floor(Math.random() * prizes.length)];
  const card = await getRandomDynamoDBItem('cards');
  const amountOfCards = Math.floor(Math.random() * 4) + 1;
  const amountOfCoins = Math.floor(Math.random() * (10000 - 5000 + 1)) + 5000;
  const coinsWithCommas = numberWithCommas(amountOfCoins);
  //const randomIndex = Math.floor(Math.random() * exp.length);
  //const randomExp = exp[randomIndex];
  const embed = new EmbedBuilder()
  .setTitle('Raffle Time!')
  .setDescription('Click the button below to enter the raffle! You can only enter once.')
  .setColor('Random');
  if(prize ==='1'){//random amount of cards to win
    console.log(card["card-id"]);
    embed.addFields({name: "Enter for a chance to win: ", value: inlineCode(String(amountOfCards)+ " copies of " + card["card-id"]), inline: true})
      .setImage(card["cardUrl"]);
      
  }
  if(prize === '2'){
    console.log(amountOfCoins);
      embed.addFields({name: "Enter for a chance to win:\n ", value: inlineCode(String(coinsWithCommas)) + " coins", inline: true})
  }
  if(prize === '3'){
     //todo in future (random exp)
  }
  const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
          .setCustomId('raffle_entry')
          .setLabel('Enter Raffle')
          .setStyle('Primary')
  );

  const message = await channel.send({ embeds: [embed], components: [row] });

  const filter = i => i.customId === 'raffle_entry';
  const collector = message.createMessageComponentCollector({ filter, time: 0.1 * 60 * 1000 }); //change back to 0.5

  collector.on('collect', async interaction => {
      if (raffleEntries.has(interaction.user.id)) {
          await interaction.reply({ content: 'You have already entered the raffle.', ephemeral: true });
      } else {
          raffleEntries.add(interaction.user.id);
          await interaction.reply({ content: 'Your entry has been noted.', ephemeral: true });
      }
  });
  collector.on('end', () => {
      if (raffleEntries.size > 0) {
        const winnerId = Array.from(raffleEntries)[Math.floor(Math.random() * raffleEntries.size)];
        const winner = client.users.cache.get(winnerId);
        if(prize === '1'){
            cardWin(winnerId, amountOfCards, card);
        }
        if(prize === '2'){
            awardMoney(winnerId, amountOfCoins);
        }
      channel.send(`Congratulations ${winner}!`);
      raffleEntries.clear();
      } else {
          channel.send('No entries for this raffle.');
      }
  });
}

async function cardWin(winnerId, amount, card){
    const owned = await checkIfUserOwnsCard('user-cards', winnerId, card["card-id"]);
    let userOwns = await getHowManyCopiesOwned('user-cards', winnerId, card["card-id"]);
    if(owned === 0){
        const item = {
            "user-id": winnerId, //primary key
            "card-id": card["card-id"], //secondary key
            "copies-owned": amount,
            exp: 0,
            level: 0,
            upgradable: false,
            tier: 1,
            totalExp: 0
        }
        await writeToDynamoDB('user-cards', item)
        .catch((error) => {
            console.error("Error:", error);
        });
        userOwns = 1;
        if(amount > 1){
            await changeNumberOwned("user-cards", winnerId, card["card-id"], parseInt(userOwns) + (amount-1));
        }
        await addToTotalCardCount("Dani-bot-playerbase", winnerId, parseInt(userOwns)+ amount)
    }else{
        await changeNumberOwned("user-cards", winnerId, card["card-id"], parseInt(userOwns) + amount);
    }
}

async function awardMoney(winnerId, amount){
    const balance = await getUsersBalance(winnerId);
    await saveUserBalance(winnerId, (parseInt(balance) + amount));
}

function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

module.exports = {forceRaffle, raffle};