"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleReady = handleReady;
const environment_1 = require("../../environment");
const discord_1 = require("../../discord");
const persistence_1 = require("../../persistence");
const logger_1 = __importDefault(require("../../services/logger"));
const timerLoop_1 = require("../../timerLoop");
const slashCommand_1 = require("./slashCommand");
const sleepcall_1 = require("../../services/sleepcall");
async function handleReady() {
    (0, timerLoop_1.startTimerLoop)();
    logger_1.default.info(undefined, `Main Bot: ${environment_1.environment.mainBot}`);
    logger_1.default.info(undefined, `Bot Id: ${environment_1.environment.botId}`);
    const guilds = discord_1.client.guilds.valueOf();
    logger_1.default.info(undefined, `Member of ${guilds.size} server(s)`);
    const timerKeys = await persistence_1.timerRepo.getAll();
    logger_1.default.info(undefined, `${timerKeys.length} running timer(s)`);
    // Restore active sleepcalls after restart
    try {
        const sleepcalls = await persistence_1.sleepcallRepo.getAll();
        const active = sleepcalls.filter(Boolean);
        logger_1.default.info(undefined, `${active.length} sleepcall(s) to restore`);
        for (const sc of active) {
            const guild = discord_1.client.guilds.cache.get(sc.guildId);
            if (guild) {
                logger_1.default.info(sc.guildId, `Restoring sleepcall in VC:${sc.channelId}`);
                (0, sleepcall_1.startSleepcall)(sc.guildId, sc.channelId, sc.youtubeUrl, guild);
            }
        }
    }
    catch (err) {
        logger_1.default.warn(undefined, `Failed to restore sleepcalls: ${err}`);
    }
    await (0, slashCommand_1.initCommands)();
}
