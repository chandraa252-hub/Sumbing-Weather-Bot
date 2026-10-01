import { environment } from "./environment";
import { client } from "./discord";
import { handleDisconnect } from "./handlers/disconnect";
import { handleError } from "./handlers/error";
import { handleGuildCreate } from "./handlers/guildCreate";
import { handleGuildDelete } from "./handlers/guildDelete";
import { handleInteractionCreate } from "./handlers/interactionCreate";
import { handleMessageCreate } from "./handlers/messageCreate";
import { handleMessageReactionAdd } from "./handlers/messageReactionAdd";
import { handleMessageReactionRemove } from "./handlers/messageReactionRemove";
import { handleReady } from "./handlers/ready";
import { handleReconnecting } from "./handlers/reconnecting";
import { redisClient } from "./persistence";
import logger from "./services/logger";
import { wrapHandler } from "./services/sentry";

const LOGIN_RETRY_DELAY_MS = 5_000;
const LOGIN_MAX_RETRY_DELAY_MS = 30_000;

function sleep(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function loginWithRetry(): Promise<void> {
    let attempt = 0;

    while (true) {
        try {
            await client.login(environment.discord.token);
            logger.info(undefined, "Discord login successful");
            return;
        } catch (error: any) {
            const errorCode = error?.code;
            const errorMessage = String(error?.message ?? error);
            const isInvalidToken =
                errorCode === "TokenInvalid" ||
                errorCode === "TOKEN_INVALID" ||
                /401|invalid token/i.test(errorMessage);

            if (isInvalidToken) {
                logger.error(undefined, error instanceof Error ? error : new Error(errorMessage));
                process.exit(1);
            }

            attempt += 1;
            const delay = Math.min(LOGIN_RETRY_DELAY_MS * attempt, LOGIN_MAX_RETRY_DELAY_MS);
            logger.warn(undefined, `Discord login failed (${errorMessage}); retrying in ${delay}ms`);
            await sleep(delay);
        }
    }
}

async function main() {
    logger.info(undefined, "Initializing...");
    await redisClient.waitForConnection();

    client.once(...wrapHandler("ready", handleReady));
    client.on(...wrapHandler("reconnecting", handleReconnecting));
    client.on(...wrapHandler("disconnect", handleDisconnect));
    client.on(...wrapHandler("error", handleError));
    client.on(...wrapHandler("messageCreate", handleMessageCreate));
    client.on(...wrapHandler("messageReactionAdd", handleMessageReactionAdd));
    client.on(...wrapHandler("messageReactionRemove", handleMessageReactionRemove));
    client.on(...wrapHandler("guildCreate", handleGuildCreate));
    client.on(...wrapHandler("guildDelete", handleGuildDelete));
    client.on(...wrapHandler("interactionCreate", handleInteractionCreate));

    client.rest.on("rateLimited", (rateLimitInfo) => {
        logger.warn(
            undefined,
            `Discord API rate limit: ${rateLimitInfo.method} ${rateLimitInfo.route} ` +
            `(scope=${rateLimitInfo.scope}, global=${rateLimitInfo.global}, ` +
            `limit=${rateLimitInfo.limit}, retryAfter=${rateLimitInfo.retryAfter}ms, ` +
            `timeToReset=${rateLimitInfo.timeToReset}ms)`
        );
    });

    logger.info(undefined, "Logging in to Discord...");
    await loginWithRetry();
}

main().catch((err) => {
    console.error("Fatal error in main():", err);
    process.exit(1);
});
