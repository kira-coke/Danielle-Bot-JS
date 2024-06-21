const Discord = require("discord.js");
const { EmbedBuilder, ActionRowBuilder,ButtonBuilder, } = require("discord.js");

const generateEmbedInv = (page, totalPages, listOfCards, msg) => {
    const embed = new EmbedBuilder()
        .setTitle(
            `Displaying all the current cards in circulation (Page ${page + 1}/${totalPages})`,
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


    embed.addFields(
        {
            name: "Group Name",
            value: " ",
            inline: true,
        },
        {
            name: "Member Name",
            value: " ",
            inline: true,
        },
        {
            name: "Card ID",
            value: " ",
            inline: true,
        },
    );

  const cardSubset = listOfCards.slice(startIndex, endIndex);

  cardSubset.forEach((attribute) => {
      embed.addFields(
          { name: " ", value: Discord.blockQuote(String(attribute["GroupName"] || "N/A")), inline: true },
          { name: " ", value: String(attribute["GroupMember"] || "N/A"), inline: true },
          { name: " ", value: Discord.inlineCode(String(attribute["card-id"] || "N/A")), inline: true }
      );
  });

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
            embeds: [generateEmbedInv(currentPage, totalPages, listOfCards, msg)],
            components: [generateRowInv(currentPage, totalPages)],
        });
    });

    collector.on("end", (collected) => {
        embedMessage.edit({ components: [] });
    });
};

module.exports = {generateEmbedInv, generateRowInv, handleCollectorInv};