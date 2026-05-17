"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.athletes = athletes;
const lodash_1 = require("lodash");
const constants_1 = require("../../constants");
const persistence_1 = require("../../persistence");
const logger_1 = __importDefault(require("../../services/logger"));
const athleteToString_1 = require("../../util/athleteToString");
const isValidDelay_1 = require("../../util/isValidDelay");
const parseUser_1 = __importDefault(require("../../util/parseUser"));
async function athletes(interaction) {
    const guild = interaction.guild;
    const guildId = guild.id;
    const config = await persistence_1.configRepo.get(guild.id);
    const options = {
        athletes: (0, lodash_1.range)(1, constants_1.SLASH_COMMAND.commands.athletes.athletesCount + 1).map((i) => interaction.options.getString(`${constants_1.SLASH_COMMAND.commands.athletes.athletesPrefix}${i}`, false)),
        times: (0, lodash_1.range)(1, constants_1.SLASH_COMMAND.commands.athletes.athletesCount + 1).map((i) => interaction.options.getInteger(`${constants_1.SLASH_COMMAND.commands.athletes.timePrefix}${i}`, false)),
    };
    logger_1.default.info(guildId, `Options: ${JSON.stringify(options)}`);
    if (options.athletes.every((a) => a === null) && options.times.every((t) => t === null)) {
        await interaction.editReply(config.athletes.map((athlete) => `• ${(0, athleteToString_1.athleteToString)(athlete)} (${athlete.time}s)`).join("\n"));
        return;
    }
    if (options.athletes.every((a) => a === null) && options.times.every((t) => t !== null)) {
        await interaction.editReply(`You must provide weather names together with their times, e.g. \`/${constants_1.SLASH_COMMAND.name} weathers extreme weather:210 normal weather:480\`.`);
        return;
    }
    const athletes = await Promise.all(options.athletes
        .map((athlete, i) => ({ athlete, time: options.times[i] ?? constants_1.DEFAULT_TIME_PER_ATHLETE }))
        .filter(({ athlete }) => athlete !== null)
        .map(({ athlete, time }) => ({ athlete, time: (0, isValidDelay_1.isValidDelay)(time) ? time : constants_1.DEFAULT_TIME_PER_ATHLETE }))
        .map(async ({ athlete, time }) => ({
        ...(await (0, parseUser_1.default)(athlete, interaction.guild).then(({ name, userId }) => ({ name, userId }))),
        time,
    })));
    if (athletes.length === 0) {
        await interaction.editReply("Error updating the weathers");
        return;
    }
    await persistence_1.configRepo.set({
        ...config,
        athletes,
    });
    await interaction.editReply(`Weathers updated
${athletes.map((athlete) => `• ${(0, athleteToString_1.athleteToString)(athlete)} (${athlete.time}s)`).join("\n")}`);
}
