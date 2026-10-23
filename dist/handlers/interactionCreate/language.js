"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.language = language;
const languages_1 = require("../../languages");
const persistence_1 = require("../../persistence");
const localized_1 = require("../../languages/localized");
async function language(interaction) {
    const guildId = interaction.guildId;
    const selectedKey = interaction.options.getString("language", true);
    const lang = languages_1.LANGUAGES.find((l) => l.key === selectedKey);
    if (!lang) {
        await interaction.editReply("Invalid language.");
        return;
    }
    const config = await persistence_1.configRepo.get(guildId);
    const updatedAthletes = config.athletes.map((athlete, i) => {
        const isDefaultName = localized_1.DEFAULT_WEATHER_NAME_ALIASES.has(athlete.name.toLowerCase().trim());
        if (i === 0 && isDefaultName) {
            return { ...athlete, name: localized_1.DEFAULT_WEATHER_NAMES[selectedKey] };
        }
        return athlete;
    });
    await persistence_1.configRepo.set({ ...config, languageKey: selectedKey, athletes: updatedAthletes });
    await interaction.editReply(`Language set to **${lang.name}**.`);
}
