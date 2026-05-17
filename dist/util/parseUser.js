"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = parseUser;
const discord_js_1 = require("discord.js");
async function parseUser(s, guild) {
    const match = discord_js_1.MessageMentions.UsersPattern.exec(s);
    if (match?.groups?.id) {
        const userId = match.groups.id;
        const guildMember = await guild.members.fetch(userId);
        return {
            name: guildMember?.displayName,
            userId,
        };
    }
    else {
        return {
            name: s,
            userId: undefined,
        };
    }
}
