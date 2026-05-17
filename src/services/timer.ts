import { TextChannel } from "discord.js";
import { configRepo } from "../persistence";
import { timerRepo } from "../persistence";
import { speakCommand } from "../speak";
import { Config, Timer } from "../types";
import { getVoiceConnection } from "../util/getVoiceConnection";
import { getTime } from "../util/time";
import { deleteStatusMessage, sendStatusMessage } from "./statusMessage";
import { type Scope } from "@sentry/node";

export async function skipCurrentAthlete(guildId: string): Promise<void> {
    const [timer, config] = await Promise.all([timerRepo.get(guildId), configRepo.get(guildId)]);
    if (timer === undefined || config === undefined) {
        return;
    }

    const nextAthleteIndex = getNextAthleteIndex(config, timer);
    await timerRepo.update(guildId, (t) => ({
        ...t,
        nextChangeTime: getTime() + config.athletes[nextAthleteIndex].time,
        currentAthleteIndex: nextAthleteIndex,
        started: true,
    }));

    const voiceConnection = await getVoiceConnection(config);
    if (voiceConnection) {
        speakCommand("skip", { nextAthlete: config.athletes[nextAthleteIndex].name }, voiceConnection, config.languageKey);
    }
}

export function getNextAthleteIndex(config: Config, timer: Timer): number {
    if (!timer.started) {
        return 0;
    }

    return (timer.currentAthleteIndex + 1) % config.athletes.length;
}

export async function addTimer(guildId: string, channel: TextChannel, scope: Scope): Promise<void> {
    if (await timerRepo.exists(guildId)) {
        return;
    }

    const config = await configRepo.get(guildId);
    const now = getTime();

    const timer: Timer = {
        guildId,
        nextChangeTime: now + (config.startDelay === 0 ? config.athletes[0].time : config.startDelay),
        currentAthleteIndex: 0,
        started: config.startDelay === 0,
        disabledAthletes: [],
    };

    await timerRepo.set(timer);
    await sendStatusMessage(channel, scope);
}

export async function stopTimer(guildId: string, scope: Scope): Promise<void> {
    await deleteStatusMessage(guildId, scope);
    await timerRepo.remove(guildId);
}
