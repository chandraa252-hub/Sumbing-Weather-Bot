"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.language = language;
const languages_1 = require("../../languages");
const persistence_1 = require("../../persistence");
async function language(interaction) {
    const guildId = interaction.guildId;
    const selectedKey = interaction.options.getString("language", true);
    const lang = languages_1.LANGUAGES.find((l) => l.key === selectedKey);
    if (!lang) {
        await interaction.editReply("Invalid language.");
        return;
    }
    const config = await persistence_1.configRepo.get(guildId);
    await persistence_1.configRepo.set({ ...config, languageKey: selectedKey });
    await interaction.editReply(`Language set to **${lang.name}**.`);
}
