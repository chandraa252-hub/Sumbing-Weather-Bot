"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_1 = require("@sentry/node");
function log(level, guildId, message, ...optionalParams) {
    let logFn;
    switch (level) {
        case "INFO":
            logFn = console.log;
            break;
        case "WARN":
            logFn = console.warn;
            break;
        case "ERROR":
            logFn = console.error;
            break;
    }
    if (guildId === undefined) {
        console.log(`[Server]`, message, ...optionalParams);
    }
    else {
        console.log(`[G:${guildId}]`, message, ...optionalParams);
    }
}
const logger = {
    info: (guildId, message, ...optionalParams) => {
        log("INFO", guildId, message, ...optionalParams);
    },
    warn: (guildId, message, ...optionalParams) => {
        log("WARN", guildId, message, ...optionalParams);
    },
    error: (guildId, error, scope = new node_1.Scope()) => {
        log("ERROR", guildId, error);
        scope.setUser({ id: guildId });
        const eventId = (0, node_1.captureException)(error, scope);
        log("INFO", guildId, `Error captured as ${eventId}`);
    },
};
exports.default = logger;
