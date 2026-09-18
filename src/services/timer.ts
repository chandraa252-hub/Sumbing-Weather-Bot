import { TextChannel } from "discord.js";
import { configRepo } from "../persistence";
import { timerRepo } from "../persistence";
import { globalTimerRepo } from "../persistence";
import { Config, Timer } from "../types";
import { getGlobalTimerSnapshot } from "./globalTimer";
import { deleteStatusMessage, sendStatusMessage } from "./statusMessage";
import { type Scope } from "@sentry/node";

export function getNextAthleteIndex(config: Config, timer: Timer): number {
    if (!timer.started) {
        return 0;
    }

    return (timer.currentAthleteIndex + 1) % config.athletes.length;
}

export async function addTimer(guildId: string, channel: TextChannel, scope: Scope): Promise<boolean> {
    const globalState = await globalTimerRepo.get();
    const globalTimer = getGlobalTimerSnapshot(globalState, guildId);
    if (!globalTimer) {
        return false;
    }

    if (await timerRepo.exists(guildId)) {
        return false;
    }

    const timer: Timer = {
        ...globalTimer,
        guildId,
        disabledAthletes: [],
    };

    await timerRepo.set(timer);
    await sendStatusMessage(channel, scope);
    return true;
}

export async function stopTimer(guildId: string, scope: Scope): Promise<void> {
    await deleteStatusMessage(guildId, scope);
    await timerRepo.remove(guildId);
}
