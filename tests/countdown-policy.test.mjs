import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
const {
    getAnnouncementKey,
    getExponentialRetryDelayMs,
    getAnnouncementSpeechPolicy,
    getDueCountdownAnnouncements,
    getLateRepeatCount,
    getUpcomingAnnouncements,
    isAnnouncementCycleActive,
    markAnnouncementOnce,
    shouldSkipLateAnnouncement,
} = loadCountdownPolicy();

function loadCountdownPolicy() {
    const source = readFileSync(new URL("../src/countdownPolicy.ts", import.meta.url), "utf8");
    const compiled = ts.transpileModule(source, {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2022,
        },
    }).outputText;
    const loadedModule = { exports: {} };
    new Function("exports", "module", compiled)(loadedModule.exports, loadedModule);
    return loadedModule.exports;
}

test("catches every crossed long-reminder threshold in countdown order", () => {
    const due = getDueCountdownAnnouncements(1_000, 881);
    assert.deepEqual(
        due.map(({ command }) => command),
        ["480", "300", "240", "180", "120"]
    );
});

test("includes a threshold on its exact due second without adding later cues", () => {
    const due = getDueCountdownAnnouncements(1_000, 970);
    assert.deepEqual(
        due.map(({ command }) => command),
        ["480", "300", "240", "180", "120", "60", "30"]
    );
});

test("prepares all cues, including zero, before their scheduled times", () => {
    const upcoming = getUpcomingAnnouncements(1_000);
    assert.equal(upcoming[0].command, "480");
    assert.equal(upcoming.at(-1)?.command, "0");
    assert.equal(upcoming.at(-1)?.dueAt, 1_000);
});

test("30-second cue tolerates up to 10 seconds late without retrying", () => {
    const policy = getAnnouncementSpeechPolicy("30");
    assert.equal(policy.maxDelaySeconds, 10);
    assert.equal(policy.retryUntilReady, false);
    assert.equal(policy.repeatIfLateAfterSeconds, undefined);
    assert.equal(shouldSkipLateAnnouncement(10, policy.maxDelaySeconds), false);
    assert.equal(shouldSkipLateAnnouncement(11, policy.maxDelaySeconds), true);
});

test("15-second and transition cues have a 3-second limit and no repeat", () => {
    for (const command of ["15", "0"]) {
        const policy = getAnnouncementSpeechPolicy(command);
        assert.equal(policy.maxDelaySeconds, 3);
        assert.equal(policy.retryUntilReady, false);
        assert.equal(policy.repeatIfLateAfterSeconds, undefined);
        assert.equal(shouldSkipLateAnnouncement(3, policy.maxDelaySeconds), false);
        assert.equal(shouldSkipLateAnnouncement(4, policy.maxDelaySeconds), true);
    }
});

test("long reminders repeat once within their individual lateness limits", () => {
    const eightMinutePolicy = getAnnouncementSpeechPolicy("480");
    assert.equal(eightMinutePolicy.maxDelaySeconds, 60);
    assert.equal(eightMinutePolicy.retryUntilReady, true);
    assert.equal(eightMinutePolicy.repeatIfLateAfterSeconds, 10);
    assert.equal(shouldSkipLateAnnouncement(60, eightMinutePolicy.maxDelaySeconds), false);
    assert.equal(shouldSkipLateAnnouncement(61, eightMinutePolicy.maxDelaySeconds), true);

    for (const command of ["300", "240", "180", "120"]) {
        const policy = getAnnouncementSpeechPolicy(command);
        assert.equal(policy.maxDelaySeconds, 30);
        assert.equal(policy.retryUntilReady, true);
        assert.equal(policy.repeatIfLateAfterSeconds, 10);
        assert.equal(shouldSkipLateAnnouncement(30, policy.maxDelaySeconds), false);
        assert.equal(shouldSkipLateAnnouncement(31, policy.maxDelaySeconds), true);
    }

    const oneMinutePolicy = getAnnouncementSpeechPolicy("60");
    assert.equal(oneMinutePolicy.maxDelaySeconds, 15);
    assert.equal(oneMinutePolicy.retryUntilReady, true);
    assert.equal(oneMinutePolicy.repeatIfLateAfterSeconds, 10);
    assert.equal(shouldSkipLateAnnouncement(15, oneMinutePolicy.maxDelaySeconds), false);
    assert.equal(shouldSkipLateAnnouncement(16, oneMinutePolicy.maxDelaySeconds), true);

    assert.equal(getLateRepeatCount(9, 10), 0);
    assert.equal(getLateRepeatCount(10, 10), 1);
});

test("queued announcements are active only for the same running timer cycle", () => {
    assert.equal(isAnnouncementCycleActive(1_000, 1_000, true, true), true);
    assert.equal(isAnnouncementCycleActive(1_000, 2_000, true, true), false);
    assert.equal(isAnnouncementCycleActive(1_000, 1_000, true, false), false);
    assert.equal(isAnnouncementCycleActive(1_000, undefined, true, undefined), false);
});

test("a timer-cycle announcement key can only be marked once", () => {
    const keys = new Set();
    const key = getAnnouncementKey(1_000, "120", "en", "clear");
    assert.equal(markAnnouncementOnce(keys, key), true);
    assert.equal(markAnnouncementOnce(keys, key), false);
});

test("voice recovery retry delay increases and is capped", () => {
    assert.equal(getExponentialRetryDelayMs(1), 500);
    assert.equal(getExponentialRetryDelayMs(2), 1_000);
    assert.equal(getExponentialRetryDelayMs(10), 15_000);
});