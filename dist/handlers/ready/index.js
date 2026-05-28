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
async function handleReady() {
    (0, timerLoop_1.startTimerLoop)();
    logger_1.default.info(undefined, `Main Bot: ${environment_1.environment.mainBot}`);
    logger_1.default.info(undefined, `Bot Id: ${environment_1.environment.botId}`);
    const guilds = discord_1.client.guilds.valueOf();
    logger_1.default.info(undefined, `Member of ${guilds.size} server(s)`);
    const timerKeys = await persistence_1.timerRepo.getAll();
    logger_1.default.info(undefined, `${timerKeys.length} running timer(s)`);
    const staleSleepcalls = await persistence_1.sleepcallRepo.getAll();
    if (staleSleepcalls.length > 0) {
        await Promise.all(staleSleepcalls.map((s) => persistence_1.sleepcallRepo.remove(s.guildId)));
        logger_1.default.info(undefined, `Cleared ${staleSleepcalls.length} stale sleepcall(s) from Redis`);
    }
    await (0, slashCommand_1.initCommands)();
}
