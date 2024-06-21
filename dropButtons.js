const {Events, MessageButton} = require("discord.js");

const { ButtonBuilder, ActionRowBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

/*async function handleDropInteraction(interaction) {
    try{
        const message = interaction.message;
            const row = message.components[0];

            if (Array.isArray(row.components)) {
                row.components.forEach(component => {
                    // Check if component has properties expected of a MessageButton
                    if (component.customId && component.setDisabled) {
                        component.setDisabled(true);
                    }
                });
                // Update message with disabled buttons and then remove
                await message.edit({ components: [] });
            }
          switch (interaction.customId) {
              case 'button1':
                  //await interaction.reply({ content: 'You clicked Button 1!' });
                  return 1;
                  //break;
              case 'button2':
                  //await interaction.reply({ content: 'You clicked Button 2!' });
                  return 2;
                  //break;
              case 'button3':
                  //await interaction.reply({ content: 'You clicked Button 2!' });
                  return 3;
                //break;
              default:
                  await interaction.reply({ content: 'Unknown button clicked!', ephemeral: true });
          }
        
    }catch (error) {
//console.error('Error handling button interaction:', error);
        if (error.code === 40060) {
            console.log('Interaction already acknowledged, ignoring');
        } else if (error.code === 10062){
            console.log('Unknown interaction already acknowledged, ignoring');
        }else{
            console.log('Error handling button interaction:', error);
        }
    }

}*/

const createDropEmbed = (msg, randomCardOne, randomCardTwo, randomCardThree) => {
    const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle("**Drop received**")
        .setFooter({
            text: msg.author.tag,
            iconURL: msg.author.displayAvatarURL({ dynamic: true }),
        })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("button1")
            .setLabel(`${randomCardOne["GroupMember"]} (${randomCardOne["Theme"]})`)
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId("button2")
            .setLabel(`${randomCardTwo["GroupMember"]} (${randomCardTwo["Theme"]})`)
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId("button3")
            .setLabel(`${randomCardThree["GroupMember"]} (${randomCardThree["Theme"]})`)
            .setStyle(ButtonStyle.Secondary)
    );

    return { embed, row };
};

const interactionCreateListener = async (interaction, msg, client) => {
    if (interaction.user.id !== msg.author.id) {
        await interaction.reply({
            content: "This is not your command",
            ephemeral: true,
        });
        return;
    }

    if (!interaction.isButton()) return;

    await interaction.deferReply();
    setTimeout(() => interaction.deleteReply(), 1000);

    if (["button1", "button2", "button3"].includes(interaction.customId)) {
            msg.reply("You have received a card");
    }

    client.removeListener("interactionCreate", (i) => interactionCreateListener(i, msg, client));
};

module.exports = { createDropEmbed, interactionCreateListener };