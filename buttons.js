const {Events, MessageButton} = require("discord.js");

async function handleDropInteraction(interaction) {
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

}

module.exports = {handleDropInteraction};