"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.status = status;
const persistence_1 = require("../../persistence");
const statusMessage_1 = require("../../services/statusMessage");
async function status(interaction) {
    const guildId = interaction.guildId;
    const [config, timer] = await Promise.all([
        persistence_1.configRepo.get(guildId),
        persistence_1.timerRepo.get(guildId),
    ]);
    if (!timer) {
        const msg = config.languageKey === "id"
            ? "Tidak ada timer yang aktif saat ini."
            : "No active timer at the moment.";
        await interaction.editReply(msg);
        return;
    }
    await interaction.editReply({ embeds: [(0, statusMessage_1.createStatusMessage)(config, timer)] });
}
