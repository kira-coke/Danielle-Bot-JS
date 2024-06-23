const Discord = require("discord.js");
const { EmbedBuilder, ActionRowBuilder,ButtonBuilder, } = require("discord.js");
const {getCardFromTable} = require("./cards.js");

async function generateEmbedInv(page, totalPages, listOfCards, msg, userId) {
    const user = await msg.client.users.fetch(userId);
    const embed = new EmbedBuilder()
        .setTitle(
            `Displaying ${user.username}'s inventory                                        (Page ${page + 1}/${totalPages})`,
        )
        .setColor("#feb69e")
        .setFooter({
            text: msg.author.tag,
            iconURL: msg.author.displayAvatarURL({
                dynamic: true,
            }),
        });

    const cardsPerPage = 4; //eunsure this matches the value on the index constant too otherwise will end up with extra blank pages
    const startIndex = page * cardsPerPage;
    const endIndex = Math.min(
        startIndex + cardsPerPage,
        listOfCards.length,
    );

  const cardSubset = listOfCards.slice(startIndex, endIndex);

    for (const attribute of cardSubset) {
      const cardData = await getCardFromTable("cards", attribute["card-id"]);
      embed.addFields(
          {  name: "\u200B",  value: `${Discord.blockQuote(Discord.bold(String(cardData["GroupMember"])))}               (${Discord.bold(String(cardData["Theme"]))})                 ${Discord.inlineCode(String(attribute["exp"])+ "/100")} |  ${Discord.inlineCode("Lvl." + String(attribute["level"]))}  |  ${Discord.inlineCode(String(attribute["copies-owned"]))}`, inline: false },
      );
  };

    return embed;
};

const generateRowInv = (page, totalPages) => {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("prev")
            .setLabel("◀")
            .setStyle("Secondary")
            .setDisabled(page === 0),
        new ButtonBuilder()
            .setCustomId("next")
            .setLabel("▶")
            .setStyle("Secondary")
            .setDisabled(page === totalPages - 1),
    );
};

const handleCollectorInv = (embedMessage, msg, totalPages, listOfCards) => {
    let currentPage = 0;
    const filter = (i) => i.user.id === msg.author.id;
    const collector = embedMessage.createMessageComponentCollector({
        filter,
        time: 30000, //how long buttons last
    });

    collector.on("collect", async (i) => {
        await i.deferUpdate();
        if (i.customId === "prev" && currentPage > 0) {
            currentPage--;
        } else if (i.customId === "next" && currentPage < totalPages - 1) {
            currentPage++;
        }
        await embedMessage.edit({
            embeds: [await generateEmbedInv(currentPage, totalPages, listOfCards, msg)],
            components: [generateRowInv(currentPage, totalPages)],
        });
    });

    collector.on("end", (collected) => {
        embedMessage.edit({ components: [] });
    });
};

module.exports = {generateEmbedInv, generateRowInv, handleCollectorInv};