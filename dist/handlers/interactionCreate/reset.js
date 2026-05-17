"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reset = reset;
const persistence_1 = require("../../persistence");
const timer_1 = require("../../services/timer");
async function reset(interaction, scope) {
    const guildId = interaction.guild.id;
    await Promise.all([(0, timer_1.stopTimer)(guildId, scope), persistence_1.configRepo.remove(guildId), interaction.editReply("Bot was reset")]);
}
