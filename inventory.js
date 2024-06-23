const Discord = require("discord.js");
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require("discord.js");
const { getCardFromTable, checkIfUserOwnsCard, getUserCard} = require("./cards.js");

async function generateEmbedInv(page, totalPages, listOfCards, msg, userId) {
  
    let user;
    try {
        user = await msg.client.users.fetch(userId);
    } catch (error) {
        console.error("Failed to fetch user:", error); // Log error if fetching fails
        throw error;
    }
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

    const cardsPerPage = 4; // Ensure this matches the value in the index constant too otherwise will end up with extra blank pages
    const startIndex = page * cardsPerPage;
    const endIndex = Math.min(
        startIndex + cardsPerPage,
        listOfCards.length,
    );

    const cardSubset = listOfCards.slice(startIndex, endIndex);
    
    for (const attribute of cardSubset) {
        try {
            const card = await getCardFromTable("cards", attribute["card-id"]);

            const ownsCard = await checkIfUserOwnsCard("user-cards", userId, attribute["card-id"]);

            if (ownsCard !== 0) {
                const cardDataArray = await getUserCard("user-cards", userId, attribute["card-id"]);
                const cardData = cardDataArray[0];
                embed.addFields(
                    { 
                        name: "\u200B", 
                        value: `${Discord.blockQuote(Discord.bold(String(card["GroupMember"])))} (${Discord.bold(String(card["Theme"]))}) ${Discord.inlineCode(String(cardData.exp) + "/100")} | ${Discord.inlineCode("Lvl." + String(cardData.level))} | ${Discord.inlineCode(String(cardData["copies-owned"]))}`, 
                        inline: false 
                    }
                );
            } else {
                embed.addFields(
                    { 
                        name: "\u200B", 
                        value: `**User does not own:** ${Discord.inlineCode(attribute["card-id"])}`, 
                        inline: false 
                    }
                );
            }
        } catch (error) {
            console.error("Error processing card:", error);
            // Optionally handle error or continue with next card
        }
    }

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

const handleCollectorInv = (embedMessage, msg, totalPages, listOfCards, userId) => {
    let currentPage = 0;
    const filter = (i) => i.user.id === msg.author.id;
    const collector = embedMessage.createMessageComponentCollector({
        filter,
        time: 30000, // How long buttons last
    });

    collector.on("collect", async (i) => {
        await i.deferUpdate();
        if (i.customId === "prev" && currentPage > 0) {
            currentPage--;
        } else if (i.customId === "next" && currentPage < totalPages - 1) {
            currentPage++;
        }
        await embedMessage.edit({
            embeds: [await generateEmbedInv(currentPage, totalPages, listOfCards, msg, userId)],
            components: [generateRowInv(currentPage, totalPages)],
        });
    });

    collector.on("end", (collected) => {
        embedMessage.edit({ components: [] });
    });
};

module.exports = { generateEmbedInv, generateRowInv, handleCollectorInv };
