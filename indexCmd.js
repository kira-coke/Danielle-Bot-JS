const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    inlineCode, blockQuote
} = require("discord.js");

const generateEmbed = (page, totalPages, filteredCards, msg) => {
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

    const cardsPerPage = 7; //eunsure this matches the value on the index constant too otherwise will end up with extra blank pages
    const startIndex = page * cardsPerPage;
    const endIndex = Math.min(
        startIndex + cardsPerPage,
        filteredCards.length,
    );
    const cardSubset = filteredCards.slice(startIndex, endIndex);

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

    cardSubset.forEach((attribute) => {
        embed.addFields(
            {
                name: " ",
                value: blockQuote(attribute.GroupName),
                inline: true,
            },
            {
                name: " ",
                value: attribute.GroupMember,
                inline: true,
            },
            {
                name: " ",
                value: inlineCode(attribute["card-id"]),
                inline: true,
            },
        );
    });

    return embed;
};

const generateRow = (page, totalPages) => {
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

const handleCollector = (embedMessage, msg, totalPages, listOfCards) => {
    let currentPage = 0;
    const filter = (i) => i.user.id === msg.author.id;
    const collector = embedMessage.createMessageComponentCollector({
        filter,
        time: 60000, // How long buttons last
    });

    collector.on("collect", async (i) => {
        try {
            // Check if interaction is still valid before deferring the update
            if (i.isButton()) {
                await i.deferUpdate();

                if (i.customId === "prev" && currentPage > 0) {
                    currentPage--;
                } else if (i.customId === "next" && currentPage < totalPages - 1) {
                    currentPage++;
                }

                await embedMessage.edit({
                    embeds: [generateEmbed(currentPage, totalPages, listOfCards, msg)],
                    components: [generateRow(currentPage, totalPages)],
                });
            }
        } catch (error) {
            console.error("Error handling interaction:", error);
        }
    });

    collector.on("end", async (collected) => {
        try {
            await embedMessage.edit({ components: [] });
        } catch (error) {
            console.error("Error handling end of collector:", error);
        }
    });
};


module.exports = { generateEmbed, generateRow, handleCollector };
