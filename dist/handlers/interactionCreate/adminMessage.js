"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminMessage = adminMessage;
const discord_1 = require("../../discord");
const persistence_1 = require("../../persistence");
const globalTimer_1 = require("../../services/globalTimer");
const logger_1 = __importDefault(require("../../services/logger"));
async function adminMessage(interaction, _scope) {
    if (!(0, globalTimer_1.isGlobalAdmin)(interaction.user.id)) {
        await interaction.editReply("⛔ Anda tidak memiliki izin untuk mengirim pesan admin.");
        return;
    }
    const content = interaction.options.getString("message", true);
    const timers = await persistence_1.timerRepo.getAll();
    const targets = timers.filter((timer) => timer?.status?.channelId !== undefined);
    if (targets.length === 0) {
        await interaction.editReply("Tidak ada guild dengan channel status timer yang bisa menerima pesan.");
        return;
    }
    const results = await Promise.allSettled(targets.map(async (timer) => {
        const channel = await discord_1.client.channels.fetch(timer.status.channelId);
        if (!channel?.isSendable()) {
            throw new Error("Status channel is not sendable");
        }
        await channel.send(content);
        return timer.guildId;
    }));
    const sent = results.filter((result) => result.status === "fulfilled").length;
    const failed = results.length - sent;
    results.forEach((result, index) => {
        if (result.status === "rejected") {
            logger_1.default.warn(targets[index].guildId, `Could not send admin message: ${result.reason?.message ?? result.reason}`);
        }
    });
    if (failed === 0) {
        await interaction.editReply(`✅ Pesan admin dikirim ke ${sent} guild.`);
        return;
    }
    await interaction.editReply(`⚠️ Pesan admin dikirim ke ${sent} guild; ${failed} guild gagal menerima pesan.`);
}
