"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RETRY_DELAY_CAP_MS = exports.LONG_ANNOUNCEMENT_REPEAT_AFTER_SECONDS = exports.TTS_PREPARATION_LEAD_SECONDS = exports.ANNOUNCEMENT_SECONDS = void 0;
exports.getUpcomingAnnouncements = getUpcomingAnnouncements;
exports.getDueCountdownAnnouncements = getDueCountdownAnnouncements;
exports.getAnnouncementKey = getAnnouncementKey;
exports.markAnnouncementOnce = markAnnouncementOnce;
exports.getAnnouncementSpeechPolicy = getAnnouncementSpeechPolicy;
exports.shouldSkipLateAnnouncement = shouldSkipLateAnnouncement;
exports.getLateRepeatCount = getLateRepeatCount;
exports.getExponentialRetryDelayMs = getExponentialRetryDelayMs;
exports.ANNOUNCEMENT_SECONDS = [480, 300, 240, 180, 120, 60, 30, 15];
exports.TTS_PREPARATION_LEAD_SECONDS = 20;
exports.LONG_ANNOUNCEMENT_REPEAT_AFTER_SECONDS = 10;
exports.RETRY_DELAY_CAP_MS = 15_000;
const LONG_ANNOUNCEMENT_COMMANDS = new Set(["480", "300", "240", "180", "120", "60"]);
const MAX_DELAY_SECONDS = {
    "0": 3,
    "15": 3,
    "30": 10,
};
function getUpcomingAnnouncements(nextChangeTime) {
    return [
        ...exports.ANNOUNCEMENT_SECONDS.map((seconds) => ({
            command: String(seconds),
            dueAt: nextChangeTime - seconds,
        })),
        { command: "0", dueAt: nextChangeTime },
    ];
}
function getDueCountdownAnnouncements(nextChangeTime, now) {
    return exports.ANNOUNCEMENT_SECONDS.filter((seconds) => now >= nextChangeTime - seconds).map((seconds) => ({
        command: String(seconds),
        dueAt: nextChangeTime - seconds,
    }));
}
function getAnnouncementKey(nextChangeTime, command, languageKey, nextAthleteName) {
    return [nextChangeTime, command, languageKey, nextAthleteName].join(":");
}
function markAnnouncementOnce(keys, key) {
    if (keys.has(key)) {
        return false;
    }
    keys.add(key);
    return true;
}
function getAnnouncementSpeechPolicy(command) {
    if (LONG_ANNOUNCEMENT_COMMANDS.has(command)) {
        return {
            retryUntilReady: true,
            repeatIfLateAfterSeconds: exports.LONG_ANNOUNCEMENT_REPEAT_AFTER_SECONDS,
        };
    }
    return {
        retryUntilReady: false,
        ...(MAX_DELAY_SECONDS[command] !== undefined ? { maxDelaySeconds: MAX_DELAY_SECONDS[command] } : {}),
    };
}
function shouldSkipLateAnnouncement(delaySeconds, maxDelaySeconds) {
    return delaySeconds >= maxDelaySeconds;
}
function getLateRepeatCount(delaySeconds, repeatAfterSeconds) {
    return delaySeconds > repeatAfterSeconds ? 1 : 0;
}
function getExponentialRetryDelayMs(attempt) {
    const safeAttempt = Math.max(1, Math.floor(attempt));
    return Math.min(500 * 2 ** (safeAttempt - 1), exports.RETRY_DELAY_CAP_MS);
}
