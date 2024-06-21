require("dotenv").config();
const prefix = ".";
const Discord = require("discord.js");
const AWS = require("aws-sdk");
AWS.config.update({
    accessKeyId: process.env["Access_key"],
    secretAccessKey: process.env["Secret_access_key"],
    region: "eu-west-2",
});
const {saveUserData,checkUserExists,checkUserDisabled,getUser,setUserCard,setUserBio} = require("./users.js");
const {isCooldownExpired,setUserCooldown,getUserCooldown} = require("./cooldowns");
const {getRandomDynamoDBItem,writeToDynamoDB,getHowManyCopiesOwned,getCardFromTable,getTotalCards,
       changeNumberOwned,checkIfUserOwnsCard,addToTotalCardCount,checkTotalCardCount} = require("./cards");
const {handleDropInteraction} = require( "./buttons");
const { getUsersBalance, saveUserBalance } = require("./userBalanceCmds");
const {GatewayIntentBits,ActionRowBuilder,ButtonBuilder,ButtonStyle,Events} = require("discord.js");
const client = new Discord.Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
});
const { EmbedBuilder } = require("discord.js");

client.on("ready", () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on("messageCreate", async (msg) => {
    if (msg.content.startsWith(prefix)) {
        const args = msg.content.slice(prefix.length).trim().split(" ");
        const command = args.shift().toLowerCase();
        const userId = msg.author.id;
        const authorTag = `${msg.author.username}#${msg.author.discriminator}`;
        const userExists = await checkUserExists(userId);
        const claimCd = 1;
        const dropCd = 5;
        if (msg.author.bot) return;

        //check for if theyre blacklisted
        if (userExists) {
            const userDisabled = await checkUserDisabled(userId);
            if (!userDisabled) {
                //returns false if they are no longer allowed to play (not enabled)
                msg.reply("**You have been blacklisted from the game**");
                return;
            }
        }
        //check if theyre not registered, then let them start, if they are inform them they are registered
        if (!userExists) {
            if (command === "start") {
                const embed = new EmbedBuilder()
                    .setColor(0x0099ff)
                    .setTitle(
                        "**Welcome to Danielle Bot **" + authorTag + "**!**",
                    )
                    .setDescription(
                        "**Enjoy your stay <:daniheart:1251995500308336723> You have been given 10,000 coins as a welcome gift!**",
                    ) // add an amount of currency here and add it to the users balance after they start
                    .setImage(
                        "https://media.discordapp.net/attachments/863906210582626335/1252011345168175225/newjeans-danielle-omg-4k-wallpaper-uhdpaper.com-2350i.jpg?ex=6670a9ed&is=666f586d&hm=985b63d3eb9d63aa6a86c8479f85e6a1d8aa61d47e5329d011978f35ab3e67a1&=&format=webp&width=1177&height=662",
                    )
                    .setTimestamp();
                msg.reply({ embeds: [embed] });
                await saveUserData(userId, String(msg.createdAt));
            } else {
                const noUserdata = new EmbedBuilder()
                    .setColor("#EE4B2B")
                    .setDescription(
                        `Ensure you have done the .start command. If you feel this is an error feel free to inform me @kira.c`,
                    )
                    .setTimestamp();
                msg.channel.send({ embeds: [noUserdata] });
                return;
            }
        } else {
            if (command === "start") {
                msg.channel.send(`**You are already registered!**`);
                return;
            }
        }

        if (command === "profile") {
            const userData = await getUser(userId);
            const userFavcard = await getCardFromTable(
                "cards",
                userData["FavCard"],
            );
            const favCardUrl = userFavcard["cardUrl"];
            const embed = new EmbedBuilder()
                .setColor("#fffac2") //should be able to change colour
                .setTitle(msg.author.username + "'s Profile")
                .setDescription(userData["Description"]) //should be able to change description
                .addFields({
                    name:
                        "**Balance: **" +
                        Discord.inlineCode(
                            String(userData["Balance"])
                                .toString()
                                .replace(/\B(?=(\d{3})+(?!\d))/g, ","),
                        ),
                    value: " ",
                    inline: true,
                })
                .addFields(
                    {
                        name: "Looking for: ",
                        value: Discord.inlineCode(userData["LookingFor"]),
                        inline: false,
                    }, // You can set inline to true if you want the field to display inline.
                )
                .addFields({
                    name:
                        "**Favourite Card: **" +
                        Discord.inlineCode(userFavcard["card-id"]),
                    value: " ",
                    inline: false,
                })
                .addFields({
                    name:
                        "**Card Count: **" +
                        Discord.inlineCode(String(userData["cardCount"])),
                    value: " ",
                    inline: false,
                })
                .setFooter({
                    text: msg.author.tag,
                    iconURL: msg.author.displayAvatarURL({ dynamic: true }),
                })
                .setImage(favCardUrl) //they should be able to change this - change card etc
                .setTimestamp();
            msg.reply({ embeds: [embed] });
        }

        if (command === "claim") {
            if (isCooldownExpired(userId, command, claimCd)) {
                setUserCooldown(userId, command);
            } else {
                const remainingTime = getUserCooldown(userId, command, claimCd);
                msg.reply(`**Remaining cooldown: ${remainingTime} seconds**`);
                return;
            }
            // get a random card from the storage and store the details to be able to be used in bellow embeded message
            (async () => {
                try {
                    const tableName = "cards";
                    const randomCard = await getRandomDynamoDBItem(tableName);
                    try {
                        const secondTableName = "user-cards";
                        const attributeName = randomCard["copies-owned"];
                        let item = {};
                        let numberOfCopies = 0;
                        const cardExistsForUser = await checkIfUserOwnsCard(
                            secondTableName,
                            userId,
                            randomCard["card-id"],
                        );
                        if (cardExistsForUser === 0) {
                            item = {
                                "user-id": userId, //primary key
                                "card-id": randomCard["card-id"], //secondary key
                                exp: 0,
                                level: 0,
                                upgradable: false,
                                "copies-owned": 1,
                            };
                        } else {
                            //msg.channel.send("You do own card, will write code to incremenet value");
                            numberOfCopies = await getHowManyCopiesOwned(
                                secondTableName,
                                userId,
                                randomCard["card-id"],
                                attributeName,
                            );
                            item = {
                                "user-id": userId, //primary key
                                "card-id": randomCard["card-id"], //secondary key
                                exp: 0,
                                level: 0,
                                upgradable: false,
                                "copies-owned": numberOfCopies + 1,
                            };
                        }
                        const cardCount = await checkTotalCardCount(
                            "Dani-bot-playerbase",
                            userId,
                        ).catch((error) => {
                            console.error(
                                "Error getting total card count:",
                                error,
                            );
                        });
                        addToTotalCardCount(
                            "Dani-bot-playerbase",
                            userId,
                            parseInt(cardCount) + 1,
                        ).catch((error) => {
                            console.error("Error updating card count:", error);
                        });
                        writeToDynamoDB(secondTableName, item)
                            .then(() => {
                                console.log(
                                    "Successfully wrote item to DynamoDB first table",
                                );
                            })
                            .catch((error) => {
                                console.error("Error:", error);
                            });

                        const embed = new EmbedBuilder()
                            .setColor("#ffd5b3")
                            //.setTitle("\n\u200B\n**Claim Recieved!**\n")
                            .setDescription(
                                `You have dropped **${randomCard["GroupName"]} ${randomCard["GroupMember"]}**`,
                            )
                            .addFields(
                                {
                                    name: "Copies now Owned",
                                    value: Discord.inlineCode(
                                        String(numberOfCopies + 1),
                                    ),
                                    inline: true,
                                }, // You can set inline to true if you want the field to display inline.
                            )
                            .setImage(randomCard["cardUrl"]) // changed depending on the card recieved
                            .setFooter({
                                text: msg.author.tag,
                                iconURL: msg.author.displayAvatarURL({
                                    dynamic: true,
                                }),
                            })
                            .setTimestamp();
                        msg.reply({ embeds: [embed] });
                    } catch (error) {
                        console.error("Error:", error);
                    }
                } catch (error) {
                    console.error("Error:", error);
                }
            })();
        }

        if (command === "drop") {
            if (isCooldownExpired(userId, command, dropCd)) {
                setUserCooldown(userId, command);
            } else {
                const remainingTime = getUserCooldown(userId, command, dropCd);
                msg.reply(`**Remaining cooldown: ${remainingTime} seconds**`);
                return;
            }
            (async () => {
                try {
                    const tableName = "cards";
                    const randomCardOne =
                        await getRandomDynamoDBItem(tableName);
                    const randomCardTwo =
                        await getRandomDynamoDBItem(tableName);
                    const randomCardThree =
                        await getRandomDynamoDBItem(tableName);

                    const embed = new EmbedBuilder()
                        .setColor(0x0099ff)
                        .setTitle("**Drop recieved**")
                        /*.setDescription(
                            "\n\u200B\n**Click an option bellow to claim a card**\n\u200B\n",
                        )*/
                        .setFooter({
                            text: msg.author.tag,
                            iconURL: msg.author.displayAvatarURL({
                                dynamic: true,
                            }),
                        })
                        .setTimestamp();

                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId("button1")
                            .setLabel(
                                String(randomCardOne["GroupMember"]) +
                                    " (" +
                                    String(randomCardOne["Theme"]) +
                                    ")",
                            )
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId("button2")
                            .setLabel(
                                String(randomCardTwo["GroupMember"]) +
                                    " (" +
                                    String(randomCardTwo["Theme"]) +
                                    ")",
                            )
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId("button3")
                            .setLabel(
                                String(randomCardThree["GroupMember"]) +
                                    " (" +
                                    String(randomCardThree["Theme"]) +
                                    ")",
                            )
                            .setStyle(ButtonStyle.Secondary),
                    );

                    msg.reply({ embeds: [embed], components: [row] });
                } catch (error) {
                    console.error("Error:", error);
                }
            })();
        }

        if (command === "bal") {
            const userBal = await getUsersBalance(userId);
            if (userBal === null) {
                const noBalanceEmbed = new EmbedBuilder()
                    .setColor("#ee9090")
                    .setTitle(`${msg.author.username}'s Balance`)
                    .setDescription(
                        `No balance found for this user. Ensure you have done the .start command. If you feel this is an error feel free to inform me @kira.c`,
                    )
                    .setTimestamp();
                msg.channel.send({ embeds: [noBalanceEmbed] });
                return;
            }
            function numberWithCommas(x) {
                return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            }
            const balWithCommas = numberWithCommas(userBal);

            const balanceEmbed = new EmbedBuilder()
                .setColor("#ffa791")
                .setTitle(`${msg.author.username}'s Balance`)
                .setDescription(
                    "**Balance: **" + Discord.inlineCode(`${balWithCommas}`),
                )
                .setTimestamp();
            msg.channel.send({ embeds: [balanceEmbed] });
        }

        if (command === "pay") {
            const amount = parseFloat(args[1]);
            if ((amount < 0) | !Number.isInteger(amount)) {
                msg.channel.send(
                    "**You are not allowed to steal monies bad oddy**",
                );
                return;
            }
            let targetUser = msg.mentions.users.first();
            if (targetUser === msg.author) {
                msg.channel.send("** Trying to give yourself money? **");
                return;
            }
            if (targetUser === undefined) {
                msg.channel.send("Please mention a user.");
                return;
            }
            if (isNaN(amount)) {
                msg.channel.send("Please provide a valid amount!");
                return;
            }
            const userExists = await checkUserExists(targetUser.id);
            if (!userExists) {
                msg.channel.send(
                    `**This user is not registered yet, please tell them to do .start**`,
                );
                return;
            } else {
                const targetUserId = targetUser.id;

                // Load balances for both users
                const userBalance = await getUsersBalance(userId);
                const targetUserBalance = await getUsersBalance(targetUserId);

                if (userBalance === null) {
                    msg.channel.send("No balance found for you.");
                    return;
                }

                if (userBalance < amount) {
                    msg.channel.send("Insufficient funds.");
                    return;
                }

                // Update balances
                await saveUserBalance(userId, userBalance - amount);
                await saveUserBalance(
                    targetUserId,
                    (targetUserBalance || 0) + amount,
                );

                const transactionEmbed = new EmbedBuilder()
                    .setColor("#90ee90")
                    .setTitle("Currency Transaction")
                    .setDescription(
                        `**You have paid ${amount} to ${targetUser.username}**`,
                    )
                    .setTimestamp();

                msg.channel.send({ embeds: [transactionEmbed] });
            }
        }

        if (command === "cd") {
            //write cooldown embed
        }

        if (command === "index") {
            const listOfCards = await getTotalCards("cards");
            const cardsPerPage = 2;
            const totalPages = Math.ceil(listOfCards.Items.length / cardsPerPage);

            let currentPage = 0;

            const generateEmbed = (page) => {
                const embed = new EmbedBuilder()
                    .setTitle(`Displaying all the current cards in circulation (Page ${page + 1}/${totalPages})`)
                    .setColor("#feb69e")
                    .setFooter({
                        text: msg.author.tag,
                        iconURL: msg.author.displayAvatarURL({
                            dynamic: true,
                        }),
                    });

                const startIndex = page * cardsPerPage;
                const endIndex = Math.min(startIndex + cardsPerPage, listOfCards.Items.length);
                const cardSubset = listOfCards.Items.slice(startIndex, endIndex);

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
                    }
                );

                cardSubset.forEach((attribute) => {
                    embed.addFields(
                        {
                            name: " ",
                            value: Discord.blockQuote(attribute.GroupName),
                            inline: true,
                        },
                        {
                            name: " ",
                            value: attribute.GroupMember,
                            inline: true,
                        },
                        {
                            name: " ",
                            value: Discord.inlineCode(attribute["card-id"]),
                            inline: true,
                        }
                    );
                });

                return embed;
            };

            const generateRow = (page) => {
                return new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('prev')
                            .setLabel('◀')
                            .setStyle('Primary')
                            .setDisabled(page === 0),
                        new ButtonBuilder()
                            .setCustomId('next')
                            .setLabel('▶')
                            .setStyle('Primary')
                            .setDisabled(page === totalPages - 1)
                    );
            };

            const embedMessage = await msg.channel.send({ embeds: [generateEmbed(currentPage)], components: [generateRow(currentPage)] });

            const filter = i => i.user.id === msg.author.id;
            const collector = embedMessage.createMessageComponentCollector({ filter, time: 60000 });

            collector.on('collect', async i => {
                await i.deferUpdate(); // Defer the interaction to prevent multiple acknowledgments

                if (i.customId === 'prev' && currentPage > 0) {
                    currentPage--;
                } else if (i.customId === 'next' && currentPage < totalPages - 1) {
                    currentPage++;
                }

                await embedMessage.edit({ embeds: [generateEmbed(currentPage)], components: [generateRow(currentPage)] });
            });

            collector.on('end', collected => {
                embedMessage.edit({ components: [] });
            });
        }

        if (command === "view") {
            //get second parameter entered by the user and parse that as the cardid to get from table
            const cardId = args[0];
            if (cardId === undefined) {
                msg.reply("**Please input a card id**");
                return;
            }
            (async () => {
                try {
                    const tableName = "cards";
                    // Call the function and store the returned URL in a const
                    const cardToView = await getCardFromTable(
                        tableName,
                        cardId,
                    );
                    const secondTableName = "user-cards";
                    const attributeName = cardToView["card-id"];
                    const numberOfCopies = await getHowManyCopiesOwned(
                        secondTableName,
                        userId,
                        attributeName,
                    );
                    //get current exp and level
                    const embed = new EmbedBuilder() //embed that shows the group name, member name, card id and card url
                        .setColor("#feb69e")
                        .setDescription(
                            `You are viewing **${cardToView["GroupName"]} ${cardToView["GroupMember"]}**`,
                        )
                        .setImage(cardToView["cardUrl"]) // changed depending on the card recieved
                        .addFields({
                            name: "You Own: ",
                            value: Discord.inlineCode(String(numberOfCopies)),
                            inline: true,
                        })
                        .setFooter({
                            text: msg.author.tag,
                            iconURL: msg.author.displayAvatarURL({
                                dynamic: true,
                            }),
                        })
                        .setTimestamp();
                    msg.reply({ embeds: [embed] });
                } catch (error) {
                    msg.reply("**Please enter a valid card id**");
                    console.log(
                        "Could not find card in table with card-id " + cardId,
                    );
                    console.error("Error:", error);
                }
            })();
        }

        if (command === "gift") {
            const cardIDToGift = args[1];
            const numberOfCopiesToGive = parseFloat(args[2]); //ideally should be !gift @user xyz 3
            if (msg.mentions.users.first() == undefined) {
                msg.channel.send("Please mention a user.");
                return;
            }
            let targetUser = msg.mentions.users.first();
            if (targetUser.id === "1251915536065892413") {
                msg.channel.send("** Trying to gift the georgeos danielle? **");
                return;
            }

            if (targetUser === msg.author) {
                msg.channel.send("** Trying to gift yourself? **");
                return;
            }
            if (isNaN(numberOfCopiesToGive)) {
                msg.channel.send(
                    "Please ensure you have given a card id and amount to gift",
                ); //theyve tried to give an invalid amount
                return;
            }
            if (numberOfCopiesToGive == 0) {
                msg.channel.send("Please give a non zero amount to gift"); //theyve tried to give an invalid amount
                return;
            }
            const userExists = await checkUserExists(targetUser.id);
            (async () => {
                const targetUserId = targetUser.id;
                const tableName = "cards";
                try {
                    card = await getCardFromTable(tableName, cardIDToGift);
                } catch (error) {
                    console.log(
                        "Couldnt find item with this card:" + cardIDToGift,
                    );
                    msg.channel.send("**Please enter a valid card id**");
                    return;
                }
                if (!userExists) {
                    msg.channel.send(
                        `**This user is not registered yet, please tell them to do .start**`,
                    );
                    return;
                }
                try {
                    const secondTableName = "user-cards";
                    const numberOfCopies = await getHowManyCopiesOwned(
                        secondTableName,
                        userId,
                        cardIDToGift,
                    );
                    if (
                        numberOfCopies == 0 ||
                        numberOfCopies < numberOfCopiesToGive
                    ) {
                        msg.channel.send(
                            "**You do not own enough copies of this card to gift**",
                        );
                        return;
                    } else {
                        try {
                            const currentOwnedByUser1 =
                                await getHowManyCopiesOwned(
                                    secondTableName,
                                    userId,
                                    cardIDToGift,
                                );
                            const currentOwnedByUser2 =
                                await getHowManyCopiesOwned(
                                    secondTableName,
                                    targetUserId,
                                    cardIDToGift,
                                );
                            if (currentOwnedByUser1 === 1) {
                                msg.reply(
                                    "**You must own more than 1 copy to gift duplicates**",
                                );
                                return;
                            }
                            if (currentOwnedByUser2 === 0) {
                                msg.reply(
                                    "**The user must own at least one copy to be gifted**",
                                );
                                return;
                            }
                            await changeNumberOwned(
                                secondTableName,
                                userId,
                                cardIDToGift,
                                parseInt(currentOwnedByUser1) -
                                    numberOfCopiesToGive,
                            );
                            await changeNumberOwned(
                                secondTableName,
                                targetUserId,
                                cardIDToGift,
                                parseInt(currentOwnedByUser2) +
                                    numberOfCopiesToGive,
                            );
                            //call the changeNumberOwned function here twiocer, once for msg user once for target user
                            //embed informing uve given x amount to targetUser
                            const embed = new EmbedBuilder()
                                .setColor("#57F287")
                                .setDescription(
                                    `You have gifted **${Discord.inlineCode(numberOfCopiesToGive)} ${cardIDToGift} to ${targetUser.displayName}**`,
                                )
                                .addFields({
                                    name: "You now have: ",
                                    value: Discord.inlineCode(
                                        String(
                                            currentOwnedByUser1 -
                                                numberOfCopiesToGive,
                                        ),
                                    ),
                                    inline: true,
                                })
                                .setFooter({
                                    text: msg.author.tag,
                                    iconURL: msg.author.displayAvatarURL({
                                        dynamic: true,
                                    }),
                                })
                                .setTimestamp();
                            msg.reply({
                                embeds: [embed],
                                allowedMentions: { repliedUser: false },
                            });
                        } catch (error) {
                            console.log("Failed to gift the cards");
                            console.log("Error:" + error);
                        }
                    }
                } catch (error) {
                    console.log(
                        "Couldn't find item in table user-cards with this card id: " +
                            cardIDToGift,
                    );
                }
            })();
        }

        if (command === "favcard") {
            const newFavCard = args[0];
            try {
                await getCardFromTable("cards", newFavCard);
            } catch (error) {
                msg.reply("**Please input a valid card id**");
                return;
            }
            //check newfaveCard is valid
            const tableName = "Dani-bot-playerbase";
            if (newFavCard === undefined) {
                msg.reply("Please input a card id");
            } else {
                (async () => {
                    try {
                        await setUserCard(tableName, userId, newFavCard);
                        msg.reply(
                            `Your favourite card has been set to **${newFavCard}**`,
                        );
                    } catch (error) {
                        msg.reply("Please enter a valid card id");
                        console.log(
                            "Could not find card in table with card-id " +
                                newFavCard,
                        );
                        console.error("Error:", error);
                    }
                })();
            }
            //call setUserAttribute(userId, attribute) with attribute being new card id parsed in
        }

        if (command === "bio") {
            const newBio = args.join(" "); //get all the shit after
            const tableName = "Dani-bot-playerbase";
            if (newBio === undefined) {
                msg.reply("Please input a bio");
            } else {
                (async () => {
                    try {
                        await setUserBio(tableName, userId, newBio);
                        msg.reply(
                            `You have changed your profile bio to **${newBio}**`,
                        );
                    } catch (error) {
                        console.error("Error:", error);
                    }
                })();
            }
            //call setUserAttribute(userId, attribute) with attribute being new card id parsed in
        }
        
        const interactionCreateListener = async (interaction) =>{ //interactino for drops
            if (interaction.user.id !== msg.author.id) {
                //can only interact with your own command
                await interaction.reply({
                    content: "This is not your command",
                    ephemeral: true,
                });
                return;
            }

            if (!interaction.isButton()) return;

           // await interaction.deferReply();

            if (interaction.customId === "button1" || interaction.customId === "button2" || interaction.customId === "button3") {
                // Handle button interactions
                const buttonClicked = await handleDropInteraction(interaction);
                if (parseInt(buttonClicked) === 1){
                    msg.reply("You have received a card");
                }
            } //can add more if statments depending on the custom ids (more buttons)

            client.removeListener("interactionCreate", interactionCreateListener);
        };

        client.on("interactionCreate", interactionCreateListener);
        
    }
});



client.login(process.env.Token);
