// Object to store cooldown timestamps
const cooldowns = {};

//checks is a certrain users cooldown for that command is up or not
function isCooldownExpired(userId, command, cooldownTime) {
    // Generate a key based on userId and command
    const cooldownKey = `${userId}-${command}`;

    // Check if the cooldownKey exists and if enough time has passed
    if (cooldowns[cooldownKey] && (Date.now() - cooldowns[cooldownKey]) < cooldownTime * 1000) {
        return false; // Cooldown has not expired
    } else {
        return true;
    }
}

//sets a cooldown for a certain command for a user (mainly used for after the command has gone through)
function setUserCooldown(userId, command) {
    // Generate a key based on userId and command
    const cooldownKey = `${userId}-${command}`;

    // Update the cooldown timestamp to the current time
    cooldowns[cooldownKey] = Date.now();
}

function getUserCooldown(userId, command, cooldownTime) {
    // Generate a key based on userId and command
    const cooldownKey = `${userId}-${command}`;

    // Check if the cooldownKey exists and if enough time has passed
    if (cooldowns[cooldownKey] && (Date.now() - cooldowns[cooldownKey]) < cooldownTime * 1000) {
        // Calculate remaining time until cooldown expires
        const remainingTime = cooldownTime * 1000 - (Date.now() - cooldowns[cooldownKey]);
        const remainingTimeSec = Math.ceil(remainingTime / 1000);
        return remainingTimeSec;
    } else {
        // Cooldown has expired or doesn't exist
        return 0;
    }
}


module.exports = { isCooldownExpired, setUserCooldown, getUserCooldown };