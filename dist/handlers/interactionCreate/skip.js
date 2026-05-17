"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.skip = skip;
const constants_1 = require("../../constants");
const persistence_1 = require("../../persistence");
const statusMessage_1 = require("../../services/statusMessage");
const timer_1 = require("../../services/timer");
async function skip(interaction) {
    const guildId = interaction.guild.id;
    if (!(await persistence_1.timerRepo.exists(guildId))) {
        await interaction.editReply(`Start the timer first using \`/${constants_1.SLASH_COMMAND.name} start\``);
        return;
    }
    await (0, timer_1.skipCurrentAthlete)(guildId);
    await Promise.all([interaction.editReply("Weather skipped"), (0, statusMessage_1.updateStatusMessage)(guildId)]);
}
