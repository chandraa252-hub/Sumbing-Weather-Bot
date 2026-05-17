"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REQUESTED_PERMISSIONS = void 0;
exports.getInviteUrl = getInviteUrl;
exports.hasSendMessagePermission = hasSendMessagePermission;
exports.hasVoicePermissions = hasVoicePermissions;
exports.hasManageMessagesPermissions = hasManageMessagesPermissions;
const discord_js_1 = require("discord.js");
const discord_1 = require("../discord");
exports.REQUESTED_PERMISSIONS = [
    discord_js_1.PermissionFlagsBits.SendMessages,
    discord_js_1.PermissionFlagsBits.ManageMessages,
    discord_js_1.PermissionFlagsBits.Connect,
    discord_js_1.PermissionFlagsBits.Speak,
];
function getInviteUrl() {
    return discord_1.client.generateInvite({
        scopes: [discord_js_1.OAuth2Scopes.Bot, discord_js_1.OAuth2Scopes.ApplicationsCommands],
        permissions: exports.REQUESTED_PERMISSIONS,
    });
}
function hasSendMessagePermission(guild) {
    return guild.members.me?.permissions.has(discord_js_1.PermissionFlagsBits.SendMessages) ?? false;
}
function hasVoicePermissions(guild) {
    return guild.members.me?.permissions.has([discord_js_1.PermissionFlagsBits.Connect, discord_js_1.PermissionFlagsBits.Speak]) ?? false;
}
function hasManageMessagesPermissions(guild) {
    return guild.members.me?.permissions.has(discord_js_1.PermissionFlagsBits.ManageMessages) ?? false;
}
