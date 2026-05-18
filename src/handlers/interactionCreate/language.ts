import { ChatInputCommandInteraction } from "discord.js";
import { LANGUAGES } from "../../languages";
import { LanguageKey } from "../../languages/types";
import { configRepo } from "../../persistence";

export async function language(interaction: ChatInputCommandInteraction): Promise<void> {
    const guildId = interaction.guildId!;
    const selectedKey = interaction.options.getString("language", true) as LanguageKey;

    const lang = LANGUAGES.find((l) => l.key === selectedKey);
    if (!lang) {
        await interaction.editReply("Invalid language.");
        return;
    }

    const config = await configRepo.get(guildId);
    await configRepo.set({ ...config, languageKey: selectedKey });

    await interaction.editReply(`Language set to **${lang.name}**.`);
}
