"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.language = language;
const languages_1 = require("../../languages");
const persistence_1 = require("../../persistence");
const WEATHER_NAMES_BY_LANGUAGE = {
    "en": ["extreme weather", "normal weather"],
    "en-us": ["extreme weather", "normal weather"],
    "id": ["cuaca buruk", "cuaca cerah"],
};
async function language(interaction) {
    const guildId = interaction.guildId;
    const selectedKey = interaction.options.getString("language", true);
    const lang = languages_1.LANGUAGES.find((l) => l.key === selectedKey);
    if (!lang) {
        await interaction.editReply("Invalid language.");
        return;
    }
    const config = await persistence_1.configRepo.get(guildId);
    const [name1, name2] = WEATHER_NAMES_BY_LANGUAGE[selectedKey];
    const updatedAthletes = config.athletes.map((athlete, i) => {
        if (i === 0) return { ...athlete, name: name1 };
        if (i === 1) return { ...athlete, name: name2 };
        return athlete;
    });
    await persistence_1.configRepo.set({ ...config, languageKey: selectedKey, athletes: updatedAthletes });
    await interaction.editReply(`Language set to **${lang.name}**.`);
}
