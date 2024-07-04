const { ActionRowBuilder, ButtonBuilder, EmbedBuilder } = require("discord.js");

const commands = [
    { name: ".start", description: "Start your adventure with Danielle Bot." },
    { name: ".profile or .p [@user]", description: "View your or someone else's profile." },
    { name: ".claim or .c", description: "Claim a free card every 5 minutes." },
    { name: ".drop or .d", description: "Claim a free card every 10 minutes." },
    { name: ".work or .w", description: "Work to earn a random amount of coins (1000-3000) every 1 hour." },
    { name: ".dg or .dungeon [card-id]", description: "Show you your current % of winning dgs with this card." },
    { name: ".dg or .dungeon [dg number]", description: "To view infomation about the dungeon rewards." },
    { name: ".dg or .dungeon [card-id] [dg number]", description: "Enter the dg for a chance at winning currency and cards." },
    { name: ".dg or .dungeon fc [dg number]", description: "Enter the dg with your currenct favcard." },
    { name: ".bal [@user]", description: "Check your or someone else's balance." },
    { name: ".pay @user amount", description: "Pay another user" },
    { name: ".cd", description: "Check your command cooldowns." },
    { name: ".index [groupName]", description: "View all available cards in the bot (can view cards in a specific group)" },
    { name: ".view or v [card-id] [fc]", description: "View details of a specific card. (fc will default to viewing your current favcard)" },
    { name: ".gift @user card-id amount", description: "Gift another user x amount of cards (note: you must keep at least one copy of the card in your inventory)" },
    { name: ".favcard or .fc [card-id]", description: "Set your favorite card." },
    { name: ".bio [new-bio]", description: "Set your profile bio." },
    { name: ".wishlist or .wl clear", description: "Clears your current wl." },
    { name: ".wishlist or .wl set [card-is...]", description: "Sets your wl." },
    { name: ".wishlist or .wl add [card-is...]", description: "Adds onto your current wl." },
    { name: ".daily", description: "Claim your daily streak bonus. (Every 7 days a bonus of x2 is applied)" },
    { name: ".inv [groupName] [@user]", description: "View your or someone else's inventory." },
    { name: ".inv levels [@user]", description: "View your or someone else's currently leveled cards." },
    { name: ".feed card-id amount", description: "Feed copies of a card to upgrade its level. (note: you must keep at least one copy of the card in your inventory)"},
    { name: ".upgrade or .u card-id", description: "Upgrade a card to increase its tier."},
    { name: ".remindersOn / remindersOff", description: "Enables or disables auto reminders."}
];

const itemsPerPage = 5;
const pages = Math.ceil(commands.length / itemsPerPage);

function helpCommand(page) {
    const startIdx = page * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    const newPageCommands = commands.slice(startIdx, endIdx);

    const embed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle("Danielle Bot Commands")
        .setDescription("List of available commands for Danielle Bot:")
        .addFields(newPageCommands.map(cmd => ({ name: cmd.name, value: cmd.description })))
        .setFooter({ text: `Page ${page + 1} of ${pages}`})
        .setTimestamp();

    return embed;
}

function generateRowHelp(currentPage, totalPages) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("previous")
            .setLabel("Previous")
            .setStyle("Secondary")
            .setDisabled(currentPage === 0),
        new ButtonBuilder()
            .setCustomId("next")
            .setLabel("Next")
            .setStyle("Secondary")
            .setDisabled(currentPage === totalPages - 1)
    );
}

function handleCollectorHelp(embedMessage, msg) {
    let currentPage = 0;
    const filter = (i) => i.user.id === msg.author.id;
    const collector = embedMessage.createMessageComponentCollector({ filter, time: 60000 });

    collector.on("collect", async (i) => {
        await i.deferUpdate();
        if (i.customId === "previous" && currentPage > 0) {
            currentPage--;
        } else if (i.customId === "next" && currentPage < pages - 1) {
            currentPage++;
        }

        const newEmbed = helpCommand(currentPage);
        await embedMessage.edit({ embeds: [newEmbed], components: [generateRowHelp(currentPage, pages)] });
    });

    collector.on("end", () => {
        embedMessage.edit({ components: [] }).catch(console.error); 
    });
}

module.exports = { helpCommand, handleCollectorHelp, generateRowHelp };
