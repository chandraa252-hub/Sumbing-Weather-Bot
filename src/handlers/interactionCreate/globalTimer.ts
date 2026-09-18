import type { Scope } from "@sentry/node";
import type { ChatInputCommandInteraction } from "discord.js";
import { globalTimerRepo, timerRepo } from "../../persistence";
import {
    createRunningGlobalState,
    createStoppedGlobalState,
    isGlobalAdmin,
    parseWitaTime,
} from "../../services/globalTimer";
import { updateStatusMessage } from "../../services/statusMessage";
import { getTime } from "../../util/time";

async function refreshGlobalStatuses(scope: Scope): Promise<void> {
    const timers = await timerRepo.getAll();
    await Promise.all(
        timers
            .filter((timer): timer is NonNullable<typeof timer> => timer !== undefined)
            .map((timer) => updateStatusMessage(timer.guildId, scope).catch(() => undefined))
    );
}

function getRequestedTime(interaction: ChatInputCommandInteraction): number | undefined {
    return parseWitaTime(interaction.options.getString("time", false) ?? undefined);
}

function isTimeInputValid(interaction: ChatInputCommandInteraction): boolean {
    const input = interaction.options.getString("time", false);
    return input === null || parseWitaTime(input) !== undefined;
}

function getOffset(interaction: ChatInputCommandInteraction): number {
    return interaction.options.getInteger("offset", false) ?? 0;
}

function getRequestedDuration(interaction: ChatInputCommandInteraction): number | undefined {
    return interaction.options.getNumber("duration", false) ?? undefined;
}

function isDurationInputValid(duration: number | undefined): boolean {
    return duration === undefined || Number.isFinite(duration) && duration > 0;
}

export async function startGlobal(interaction: ChatInputCommandInteraction, scope: Scope): Promise<void> {
    if (!isGlobalAdmin(interaction.user.id)) {
        await interaction.editReply("⛔ Anda tidak memiliki izin untuk mengatur timer global.");
        return;
    }

    if (!isTimeInputValid(interaction)) {
        await interaction.editReply("Format waktu tidak valid. Gunakan format WITA `HH.MM.SS`, contoh `22.30.00`.");
        return;
    }

    const current = await globalTimerRepo.get();
    const startAt = getRequestedTime(interaction)!;
    const nextState = createRunningGlobalState(startAt, undefined, current?.cycleDuration);
    if (current?.weathers?.length) {
        nextState.weathers = current.weathers;
    }
    await globalTimerRepo.set(nextState);
    await refreshGlobalStatuses(scope);

    const requestedTime = interaction.options.getString("time", false);
    const mode = requestedTime ? "dijadwalkan" : "dimulai";
    await interaction.editReply(`✅ Timer global ${mode}. Waktu acuan: <t:${startAt}:F>.`);
}

export async function stopGlobal(interaction: ChatInputCommandInteraction, scope: Scope): Promise<void> {
    if (!isGlobalAdmin(interaction.user.id)) {
        await interaction.editReply("⛔ Anda tidak memiliki izin untuk mengatur timer global.");
        return;
    }

    const current = await globalTimerRepo.get();
    if (!current) {
        await interaction.editReply("Timer global belum pernah dikonfigurasi.");
        return;
    }

    const requestedTime = interaction.options.getString("time", false);
    if (!isTimeInputValid(interaction)) {
        await interaction.editReply("Format waktu tidak valid. Gunakan format WITA `HH.MM.SS`, contoh `22.30.00`.");
        return;
    }

    const stopAt = getRequestedTime(interaction)!;
    const now = getTime();
    if (requestedTime !== null && stopAt > now) {
        await globalTimerRepo.set({
            ...current,
            status: "running",
            stopAt,
            updatedAt: now,
        });
        await refreshGlobalStatuses(scope);
        await interaction.editReply(`⏹️ Timer global dijadwalkan berhenti pada <t:${stopAt}:F>.`);
        return;
    }

    await globalTimerRepo.set(createStoppedGlobalState(current));
    await refreshGlobalStatuses(scope);
    await interaction.editReply("⏹️ Timer global dihentikan.");
}

export async function adjustGlobal(interaction: ChatInputCommandInteraction, scope: Scope): Promise<void> {
    if (!isGlobalAdmin(interaction.user.id)) {
        await interaction.editReply("⛔ Anda tidak memiliki izin untuk mengatur timer global.");
        return;
    }

    if (!isTimeInputValid(interaction)) {
        await interaction.editReply("Format waktu tidak valid. Gunakan format WITA `HH.MM.SS`, contoh `22.30.00`.");
        return;
    }

    const current = await globalTimerRepo.get();
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
        ? getRequestedTime(interaction)!
        : adjustsSavedStart
            ? current!.startAt! + offset
            : keepsSavedStart
                ? current!.startAt!
                : getTime();
    const nextState = createRunningGlobalState(startAt, undefined, duration ?? current?.cycleDuration);
    if (current?.weathers?.length) {
        nextState.weathers = current.weathers;
    }
    await globalTimerRepo.set(nextState);
    await refreshGlobalStatuses(scope);

    const offsetLabel = offset === 0 || requestedTime !== null
        ? ""
        : ` Koreksi: ${offset > 0 ? "+" : ""}${offset} detik.`;
    const durationLabel = duration === undefined ? "" : ` Durasi siklus: ${duration} detik.`;
    await interaction.editReply(`🔄 Timer global disesuaikan. Waktu acuan: <t:${startAt}:F>.${offsetLabel}${durationLabel}`);
}