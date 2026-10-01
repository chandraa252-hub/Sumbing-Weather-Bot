export const ANNOUNCEMENT_SECONDS = [480, 300, 240, 180, 120, 60, 30, 15] as const;
export const TTS_PREPARATION_LEAD_SECONDS = 20;
export const LONG_ANNOUNCEMENT_REPEAT_AFTER_SECONDS = 10;
export const RETRY_DELAY_CAP_MS = 15_000;

const LONG_ANNOUNCEMENT_COMMANDS = new Set(["480", "300", "240", "180", "120", "60"]);
const MAX_DELAY_SECONDS: Record<string, number> = {
    "0": 3,
    "15": 3,
    "30": 10,
};

export interface CountdownAnnouncement {
    command: string;
    dueAt: number;
}

export interface AnnouncementSpeechPolicy {
    maxDelaySeconds?: number;
    retryUntilReady: boolean;
    repeatIfLateAfterSeconds?: number;
}

export function getUpcomingAnnouncements(nextChangeTime: number): CountdownAnnouncement[] {
    return [
        ...ANNOUNCEMENT_SECONDS.map((seconds) => ({
            command: String(seconds),
            dueAt: nextChangeTime - seconds,
        })),
        { command: "0", dueAt: nextChangeTime },
    ];
}

export function getDueCountdownAnnouncements(
    nextChangeTime: number,
    now: number
): CountdownAnnouncement[] {
    return ANNOUNCEMENT_SECONDS.filter((seconds) => now >= nextChangeTime - seconds).map((seconds) => ({
        command: String(seconds),
        dueAt: nextChangeTime - seconds,
    }));
}

export function getAnnouncementKey(
    nextChangeTime: number,
    command: string,
    languageKey: string,
    nextAthleteName: string
): string {
    return [nextChangeTime, command, languageKey, nextAthleteName].join(":");
}

export function markAnnouncementOnce(keys: Set<string>, key: string): boolean {
    if (keys.has(key)) {
        return false;
    }
    keys.add(key);
    return true;
}

export function getAnnouncementSpeechPolicy(command: string): AnnouncementSpeechPolicy {
    if (LONG_ANNOUNCEMENT_COMMANDS.has(command)) {
        return {
            retryUntilReady: true,
            repeatIfLateAfterSeconds: LONG_ANNOUNCEMENT_REPEAT_AFTER_SECONDS,
        };
    }

    return {
        retryUntilReady: false,
        ...(MAX_DELAY_SECONDS[command] !== undefined ? { maxDelaySeconds: MAX_DELAY_SECONDS[command] } : {}),
    };
}

export function shouldSkipLateAnnouncement(delaySeconds: number, maxDelaySeconds: number): boolean {
    return delaySeconds >= maxDelaySeconds;
}

export function getLateRepeatCount(delaySeconds: number, repeatAfterSeconds: number): number {
    return delaySeconds > repeatAfterSeconds ? 1 : 0;
}

export function getExponentialRetryDelayMs(attempt: number): number {
    const safeAttempt = Math.max(1, Math.floor(attempt));
    return Math.min(500 * 2 ** (safeAttempt - 1), RETRY_DELAY_CAP_MS);
}