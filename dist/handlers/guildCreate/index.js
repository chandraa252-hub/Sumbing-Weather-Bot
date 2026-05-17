"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleGuildCreate = handleGuildCreate;
const slashCommand_1 = require("../ready/slashCommand");
const logger_1 = __importDefault(require("../../services/logger"));
const permissions_1 = require("../../services/permissions");
async function handleGuildCreate({ args: [guild] }) {
    logger_1.default.info(guild.id, `Joined Guild "${guild.name}"`);
    await (0, slashCommand_1.registerGuildCommands)(guild.id);
    logger_1.default.info(guild.id, "Permissions:");
    for (const permission of permissions_1.REQUESTED_PERMISSIONS) {
        const hasPermission = guild.members.me.permissions.has(permission);
        logger_1.default.info(guild.id, `${permission}: ${hasPermission ? "yes" : "no"}`);
    }
}
