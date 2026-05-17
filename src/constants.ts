import { environment } from "./environment";

export const DEFAULT_WEATHERS = [
    { name: "extreme weather", time: 210 },
    { name: "normal weather", time: 480 },
] as const;

export const DEFAULT_START_DELAY = 0;
export const DEFAULT_TIME_PER_ATHLETE = 30;

export const EMPTY_VC_TIMEOUT = 60 * 60; // 60 minutes

// Slash Commands
export const SLASH_COMMAND = {
    name: `timer${environment.mainBot ? "" : environment.botId}`,
    commands: {
        start: "start",
        stop: "stop",
        help: "help",
        athletes: {
            name: "weathers",
            athletesCount: 8,
            athletesPrefix: "weather",
            timePrefix: "time",
        },
        skip: {
            name: "skip",
        },
        reset: {
            name: "reset",
        },
    },
};
