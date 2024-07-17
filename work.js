const {getUsersBalance, saveUserBalance} = require("./userBalanceCmds");
const { EmbedBuilder } = require("discord.js");
const Discord = require("discord.js");
const {checkUserInTable} = require("./achievements");

async function work(msg, userId){
  const userBal = await getUsersBalance(userId);
  let randomNumber = Math.floor(Math.random() * (3000 - 1000 + 1)) + 1000;
  const achievementsDone = await achievements(userId);
  const multiplier = 1+(0.01*achievementsDone);
  console.log(multiplier);
  randomNumber = Math.floor(randomNumber * multiplier);
  const newBalance = userBal + randomNumber;
  function numberWithCommas(x) {
      return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  const bonusNumber = Math.floor(Math.random() * 10) + 1; //change the 100 value to alter percentage of bonus
  if(bonusNumber === 1){
    const numberWithBonuses = randomNumber * 2;
    const newBalanceWithBonuses = userBal+ numberWithBonuses;
    const balanceFormated = numberWithCommas(newBalanceWithBonuses);

    const balanceEmbed = new EmbedBuilder()
        .setColor("#3498DB")
        .setTitle(`Congrats! You worked extra hard and have earned double: ${Discord.inlineCode(numberWithCommas(numberWithBonuses))}`)
        .setDescription(
            "**New balance: **" + Discord.inlineCode(`${balanceFormated}`),
        )
        .setTimestamp();
    msg.channel.send({ embeds: [balanceEmbed] });
    await saveUserBalance(userId, newBalanceWithBonuses);
    return;
  }
  const balWithCommas = numberWithCommas(newBalance);

  const balanceEmbed = new EmbedBuilder()
      .setColor("#ffa791")
      .setTitle(`You worked hard and earned: ${Discord.inlineCode(numberWithCommas(randomNumber))}`)
      .setDescription(
          "**New balance: **" + Discord.inlineCode(`${balWithCommas}`),
      )
      .setTimestamp();
      msg.channel.send({ embeds: [balanceEmbed] });
      await saveUserBalance(userId, newBalance);
  }

async function achievements(userId){
    let userAchievements = await checkUserInTable(userId);
    const countCategoryAchievements = (categoryAchievements) => {
        return Object.keys(categoryAchievements).length;
    };
    function countTotalAchievements(userAchievements) {
        const tierCount = countCategoryAchievements(userAchievements.tier);
        const dailyCount = countCategoryAchievements(userAchievements.daily);
        const cardCountCount = countCategoryAchievements(
            userAchievements.cardcount,
        );
        const totalExpCount = countCategoryAchievements(
            userAchievements.totalexp,
        );

        return tierCount + dailyCount + cardCountCount + totalExpCount;
    }
    const totalAchievements = countTotalAchievements(userAchievements);
    console.log(totalAchievements);

    const countCompletedCategoryAchievements = (categoryAchievements) => {
        return Object.values(categoryAchievements).filter((value) => value)
            .length;
    };

    // Function to count total completed achievements
    function countTotalCompletedAchievements(userAchievements) {
        const completedTierCount = countCompletedCategoryAchievements(
            userAchievements.tier,
        );
        const completedDailyCount = countCompletedCategoryAchievements(
            userAchievements.daily,
        );
        const completedCardCountCount = countCompletedCategoryAchievements(
            userAchievements.cardcount,
        );
        const completedTotalExpCount = countCompletedCategoryAchievements(
            userAchievements.totalexp,
        );

        return (
            completedTierCount +
            completedDailyCount +
            completedCardCountCount +
            completedTotalExpCount
        );
    }
    const totalCompletedAchievements = countTotalCompletedAchievements(userAchievements);
    console.log(totalCompletedAchievements);
    return totalCompletedAchievements;
}

module.exports = {work};
