const prizes = ['1', '2', '3'];
const exp = [100, 200, 300];
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, inlineCode} = require("discord.js");
const {getRandomDynamoDBItem, changeNumberOwned, addToTotalCardCount, checkIfUserOwnsCard, writeToDynamoDB, getHowManyCopiesOwned, getUserCard, checkTotalCardCount} = require("./cards");
const {getUsersBalance, saveUserBalance} = require("./userBalanceCmds");
const {getUser, updateTotalExp} = require("./users");
const {updateUserData, calculateLevelUpXP} = require("./cardExpSystem");
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
  const randomIndex = Math.floor(Math.random() * exp.length);
  const randomExp = exp[randomIndex];
  const embed = new EmbedBuilder()
  .setTitle('Raffle Time!')
  .setDescription('Click the button below to enter the raffle! You can only enter once.')
  .setColor('Random');
  if(prize ==='1'){//random amount of cards to win
    embed.addFields({name: "Enter for a chance to win: ", value: inlineCode(String(amountOfCards)+ " copies of " + card["card-id"]), inline: true})
      .setImage(card["cardUrl"]);
      
  }
  if(prize === '2'){
      embed.addFields({name: "Enter for a chance to win:\n ", value: inlineCode(String(coinsWithCommas)) + " coins", inline: true})
  }
  if(prize === '3'){
     embed.addFields({name: "Enter for a chance to win:\n ", value: inlineCode(String(randomExp)) + " exp", inline: true})
     embed.addFields({name: "WARNING:\n ", value: "This exp will be applied to your curent fav card. You can change this using .favCard", inline: false})
  }
  const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
          .setCustomId('raffle_entry')
          .setLabel('Enter Raffle')
          .setStyle('Primary')
  );

  const message = await channel.send({ embeds: [embed], components: [row] });

  const filter = i => i.customId === 'raffle_entry';
  const collector = message.createMessageComponentCollector({ filter, time: 5 * 60 * 1000 }); //change back to 5

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
        if(prize === '3'){
            awardExp(winnerId, randomExp);
        }
      channel.send(`Congratulations ${winner}!`);
      } else {
          channel.send('No entries for this raffle.');
      }
      const disabledRow = new ActionRowBuilder()
          .addComponents(
              new ButtonBuilder()
                  .setCustomId('enterRaffle')
                  .setLabel('Enter Raffle')
                  .setStyle('Primary')
                  .setDisabled(true)
          );

      message.edit({
          content: 'The raffle has ended!',
          components: [disabledRow]
      });
      raffleEntries.clear();
  });
}

async function cardWin(winnerId, amount, card){
    try{
        const owned = await checkIfUserOwnsCard('user-cards', winnerId, card["card-id"]);
        let userOwns = await getHowManyCopiesOwned('user-cards', winnerId, card["card-id"]);
        let userTotalCount = await checkTotalCardCount('Dani-bot-playerbase', winnerId);
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
            await addToTotalCardCount("Dani-bot-playerbase", winnerId, parseInt(userTotalCount)+ amount);
        }else{
            await changeNumberOwned("user-cards", winnerId, card["card-id"], parseInt(userOwns) + amount);
            await addToTotalCardCount("Dani-bot-playerbase", winnerId, parseInt(userTotalCount)+ amount)
        }   
    }catch(error){
        console.log("Error awarding cards from raffle");
        console.log("Error:", error);
    }
}

async function awardMoney(winnerId, amount){
    try{
        const balance = await getUsersBalance(winnerId);
        await saveUserBalance(winnerId, (parseInt(balance) + amount));
    }catch(error){
        console.log("Error awarding money from raffle");
        console.log("Error:", error);
    }
}

async function awardExp(winnerId, exp){
    try{
        let expGiven = exp;
        const user = await getUser(winnerId);
        const userFavCard = user["FavCard"];
        const userCardData = await getUserCard("user-cards", winnerId, userFavCard);
        let currentLevel = userCardData[0].level;
        let currentExp = parseInt(userCardData[0].exp);
        while (expGiven > 0 && currentLevel < 20) {
            const levelUpXP = calculateLevelUpXP(currentLevel);
            const expNeededToLevelUp = levelUpXP - currentExp;

            if (expGiven >= expNeededToLevelUp) {
                expGiven -= expNeededToLevelUp;
                currentLevel += 1;
                currentExp = 0; // Reset current exp after leveling up
                console.log(`Leveled up to ${currentLevel}, remaining EXP to distribute: ${expGiven}`);
            } else {
                currentExp += expGiven;
                expGiven = 0; // All expGiven is now added
            }
        }

        userCardData[0].level = currentLevel;
        userCardData[0].exp = currentExp;
        userCardData[0].totalExp = parseInt(userCardData[0].totalExp) + (exp-expGiven);
        await updateUserData("user-cards", userCardData[0]);
        user.TotalExp = parseInt(user.TotalExp) + exp;
        await updateTotalExp("Dani-bot-playerbase", winnerId, user.TotalExp);
    }catch(error){
        console.log("Error awarding exp from raffle");
        console.log("Error:", error);
    }
}

function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

module.exports = {forceRaffle, raffle};