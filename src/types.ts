import { LanguageKey } from "./languages/types";

export interface Config {
    guildId: string;
    voiceChannelId?: string;
    startDelay: number;
    athletes: Athlete[];
    languageKey: LanguageKey;
}

export interface Athlete {
    name: string;
    time: number;
    userId?: string;
}

export interface Timer {
    guildId: string;
    nextChangeTime: number;
    currentAthleteIndex: number;
    started: boolean;
    status?: {
        channelId: string;
        messageId: string;
    };
    disabledAthletes: Pick<Athlete, "name" | "userId">[];
}

export type GlobalTimerStatus = "running" | "stopped";

export interface GlobalTimerState {
    status: GlobalTimerStatus;
    startAt?: number;
    stopAt?: number;
    cycleDuration?: number;
    weathers: Athlete[];
    updatedAt: number;
}
