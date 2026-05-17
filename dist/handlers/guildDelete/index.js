"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleGuildDelete = handleGuildDelete;
const persistence_1 = require("../../persistence");
const persistence_2 = require("../../persistence");
const logger_1 = __importDefault(require("../../services/logger"));
async function handleGuildDelete({ args: [guild] }) {
    logger_1.default.info(guild.id, `Left Guild "${guild.name}"`);
    await Promise.all([persistence_2.timerRepo.remove(guild.id), persistence_1.configRepo.remove(guild.id)]);
}
