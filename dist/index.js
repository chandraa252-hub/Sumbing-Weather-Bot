"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const environment_1 = require("./environment");
const discord_1 = require("./discord");
const disconnect_1 = require("./handlers/disconnect");
const error_1 = require("./handlers/error");
const guildCreate_1 = require("./handlers/guildCreate");
const guildDelete_1 = require("./handlers/guildDelete");
const interactionCreate_1 = require("./handlers/interactionCreate");
const messageCreate_1 = require("./handlers/messageCreate");
const messageReactionAdd_1 = require("./handlers/messageReactionAdd");
const messageReactionRemove_1 = require("./handlers/messageReactionRemove");
const ready_1 = require("./handlers/ready");
const reconnecting_1 = require("./handlers/reconnecting");
const persistence_1 = require("./persistence");
const logger_1 = __importDefault(require("./services/logger"));
const sentry_1 = require("./services/sentry");
const LOGIN_RETRY_DELAY_MS = 5_000;
const LOGIN_MAX_RETRY_DELAY_MS = 30_000;
function sleep(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
async function loginWithRetry() {
    let attempt = 0;
    while (true) {
        try {
            await discord_1.client.login(environment_1.environment.discord.token);
            logger_1.default.info(undefined, "Discord login successful");
            return;
        }
        catch (error) {
            const errorCode = error?.code;
            const errorMessage = String(error?.message ?? error);
            const isInvalidToken = errorCode === "TokenInvalid" ||
                errorCode === "TOKEN_INVALID" ||
                /401|invalid token/i.test(errorMessage);
            if (isInvalidToken) {
                logger_1.default.error(undefined, error instanceof Error ? error : new Error(errorMessage));
                process.exit(1);
            }
            attempt += 1;
            const delay = Math.min(LOGIN_RETRY_DELAY_MS * attempt, LOGIN_MAX_RETRY_DELAY_MS);
            logger_1.default.warn(undefined, `Discord login failed (${errorMessage}); retrying in ${delay}ms`);
            await sleep(delay);
        }
    }
}
async function main() {
    logger_1.default.info(undefined, "Initializing...");
    await persistence_1.redisClient.waitForConnection();
    discord_1.client.once(...(0, sentry_1.wrapHandler)("ready", ready_1.handleReady));
    discord_1.client.once(...(0, sentry_1.wrapHandler)("reconnecting", reconnecting_1.handleReconnecting));
    discord_1.client.once(...(0, sentry_1.wrapHandler)("disconnect", disconnect_1.handleDisconnect));
    discord_1.client.on(...(0, sentry_1.wrapHandler)("error", error_1.handleError));
    discord_1.client.on(...(0, sentry_1.wrapHandler)("messageCreate", messageCreate_1.handleMessageCreate));
    discord_1.client.on(...(0, sentry_1.wrapHandler)("messageReactionAdd", messageReactionAdd_1.handleMessageReactionAdd));
    discord_1.client.on(...(0, sentry_1.wrapHandler)("messageReactionRemove", messageReactionRemove_1.handleMessageReactionRemove));
    discord_1.client.on(...(0, sentry_1.wrapHandler)("guildCreate", guildCreate_1.handleGuildCreate));
    discord_1.client.on(...(0, sentry_1.wrapHandler)("guildDelete", guildDelete_1.handleGuildDelete));
    discord_1.client.on(...(0, sentry_1.wrapHandler)("interactionCreate", interactionCreate_1.handleInteractionCreate));
    discord_1.client.rest.on("rateLimited", (rateLimitInfo) => {
        logger_1.default.warn(undefined, `Discord API rate limit: ${rateLimitInfo.method} ${rateLimitInfo.route} ` +
            `(scope=${rateLimitInfo.scope}, global=${rateLimitInfo.global}, ` +
            `limit=${rateLimitInfo.limit}, retryAfter=${rateLimitInfo.retryAfter}ms, ` +
            `timeToReset=${rateLimitInfo.timeToReset}ms)`);
    });
    logger_1.default.info(undefined, "Logging in to Discord...");
    await loginWithRetry();
}
main().catch((err) => {
    console.error("Fatal error in main():", err);
    process.exit(1);
});
