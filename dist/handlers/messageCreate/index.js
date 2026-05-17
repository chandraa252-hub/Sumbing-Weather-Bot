"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleMessageCreate = handleMessageCreate;
const constants_1 = require("../../constants");
async function handleMessageCreate({ args: [message] }) {
    if (message.author.bot) {
        // ignore bot messages
        return;
    }
    if (!message.member && "send" in message.channel) {
        message.channel.send(`The timer can only be on servers/guilds - not in direct messages. Add me to a server/guild and type \`/${constants_1.SLASH_COMMAND["name"]} help\` for more details.`);
        return;
    }
}
