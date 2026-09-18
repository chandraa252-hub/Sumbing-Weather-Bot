"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startGlobal = startGlobal;
exports.stopGlobal = stopGlobal;
exports.adjustGlobal = adjustGlobal;
const persistence_1 = require("../../persistence");
const globalTimer_1 = require("../../services/globalTimer");
const statusMessage_1 = require("../../services/statusMessage");
const time_1 = require("../../util/time");
async function refreshGlobalStatuses(scope) {
    const timers = await persistence_1.timerRepo.getAll();
    await Promise.all(timers
        .filter((timer) => timer !== undefined)
        .map((timer) => (0, statusMessage_1.updateStatusMessage)(timer.guildId, scope).catch(() => undefined)));
}
function getRequestedTime(interaction) {
    return (0, globalTimer_1.parseWitaTime)(interaction.options.getString("time", false) ?? undefined);
}
function isTimeInputValid(interaction) {
    const input = interaction.options.getString("time", false);
    return input === null || (0, globalTimer_1.parseWitaTime)(input) !== undefined;
}
function getOffset(interaction) {
    return interaction.options.getInteger("offset", false) ?? 0;
}
function getRequestedDuration(interaction) {
    return interaction.options.getNumber("duration", false) ?? undefined;
}
function isDurationInputValid(duration) {
    return duration === undefined || Number.isFinite(duration) && duration > 0;
}
async function startGlobal(interaction, scope) {
    if (!(0, globalTimer_1.isGlobalAdmin)(interaction.user.id)) {
        await interaction.editReply("⛔ Anda tidak memiliki izin untuk mengatur timer global.");
        return;
    }
    if (!isTimeInputValid(interaction)) {
        await interaction.editReply("Format waktu tidak valid. Gunakan format WITA `HH.MM.SS`, contoh `22.30.00`.");
        return;
    }
    const current = await persistence_1.globalTimerRepo.get();
    const startAt = getRequestedTime(interaction);
    const nextState = (0, globalTimer_1.createRunningGlobalState)(startAt, undefined, current?.cycleDuration);
    if (current?.weathers?.length) {
        nextState.weathers = current.weathers;
    }
    await persistence_1.globalTimerRepo.set(nextState);
    await refreshGlobalStatuses(scope);
    const requestedTime = interaction.options.getString("time", false);
    const mode = requestedTime ? "dijadwalkan" : "dimulai";
    await interaction.editReply(`✅ Timer global ${mode}. Waktu acuan: <t:${startAt}:F>.`);
}
async function stopGlobal(interaction, scope) {
    if (!(0, globalTimer_1.isGlobalAdmin)(interaction.user.id)) {
        await interaction.editReply("⛔ Anda tidak memiliki izin untuk mengatur timer global.");
        return;
    }
    const current = await persistence_1.globalTimerRepo.get();
    if (!current) {
        await interaction.editReply("Timer global belum pernah dikonfigurasi.");
        return;
    }
    const requestedTime = interaction.options.getString("time", false);
    if (!isTimeInputValid(interaction)) {
        await interaction.editReply("Format waktu tidak valid. Gunakan format WITA `HH.MM.SS`, contoh `22.30.00`.");
        return;
    }
    const stopAt = getRequestedTime(interaction);
    const now = (0, time_1.getTime)();
    if (requestedTime !== null && stopAt > now) {
        await persistence_1.globalTimerRepo.set({
            ...current,
            status: "running",
            stopAt,
            updatedAt: now,
        });
        await refreshGlobalStatuses(scope);
        await interaction.editReply(`⏹️ Timer global dijadwalkan berhenti pada <t:${stopAt}:F>.`);
        return;
    }
    await persistence_1.globalTimerRepo.set((0, globalTimer_1.createStoppedGlobalState)(current));
    await refreshGlobalStatuses(scope);
    await interaction.editReply("⏹️ Timer global dihentikan.");
}
async function adjustGlobal(interaction, scope) {
    if (!(0, globalTimer_1.isGlobalAdmin)(interaction.user.id)) {
        await interaction.editReply("⛔ Anda tidak memiliki izin untuk mengatur timer global.");
        return;
    }
    if (!isTimeInputValid(interaction)) {
        await interaction.editReply("Format waktu tidak valid. Gunakan format WITA `HH.MM.SS`, contoh `22.30.00`.");
        return;
    }
    const current = await persistence_1.globalTimerRepo.get();
    const requestedTime = interaction.options.getString("time", false);
    const offset = getOffset(interaction);
    const duration = getRequestedDuration(interaction);
    if (!isDurationInputValid(duration)) {
        await interaction.editReply("Durasi timer harus berupa angka desimal yang lebih besar dari 0.");
        return;
    }
    if (requestedTime !== null && offset !== 0) {
        await interaction.editReply("Gunakan `time` atau `offset`, bukan keduanya sekaligus.");
        return;
    }
    const adjustsSavedStart = requestedTime === null && offset !== 0;
    const keepsSavedStart = requestedTime === null && offset === 0 && duration !== undefined;
    if ((adjustsSavedStart || keepsSavedStart) && current?.startAt === undefined) {
        await interaction.editReply("Timer global belum pernah dikonfigurasi, jadi tidak ada waktu acuan yang bisa dikoreksi.");
        return;
    }
    const startAt = requestedTime !== null
        ? getRequestedTime(interaction)
        : adjustsSavedStart
            ? current.startAt + offset
            : keepsSavedStart
                ? current.startAt
                : (0, time_1.getTime)();
    const nextState = (0, globalTimer_1.createRunningGlobalState)(startAt, undefined, duration ?? current?.cycleDuration);
    if (current?.weathers?.length) {
        nextState.weathers = current.weathers;
    }
    await persistence_1.globalTimerRepo.set(nextState);
    await refreshGlobalStatuses(scope);
    const offsetLabel = offset === 0 || requestedTime !== null
        ? ""
        : ` Koreksi: ${offset > 0 ? "+" : ""}${offset} detik.`;
    const durationLabel = duration === undefined ? "" : ` Durasi siklus: ${duration} detik.`;
    await interaction.editReply(`🔄 Timer global disesuaikan. Waktu acuan: <t:${startAt}:F>.${offsetLabel}${durationLabel}`);
}
