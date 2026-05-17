"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.client = void 0;
const discord_js_1 = require("discord.js");
exports.client = new discord_js_1.Client({
    presence: {
        afk: false,
        activities: [
            {
                name: "Sumbing Weather Timer",
                type: discord_js_1.ActivityType.Watching,
            },
        ],
        status: "online",
    },
    intents: [
        discord_js_1.IntentsBitField.Flags.Guilds,
        discord_js_1.IntentsBitField.Flags.GuildMessages,
        discord_js_1.IntentsBitField.Flags.GuildMessageReactions,
        discord_js_1.IntentsBitField.Flags.GuildVoiceStates,
        discord_js_1.IntentsBitField.Flags.DirectMessages,
    ],
    partials: [discord_js_1.Partials.Channel, discord_js_1.Partials.Message, discord_js_1.Partials.Reaction],
});
