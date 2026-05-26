import { type Scope } from "@sentry/node";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    EmbedBuilder,
} from "discord.js";
import { BUTTON_SOUND_PREFIX, BUTTON_SOUNDBOARD_CLOSE } from "../../constants";
import { configRepo } from "../../persistence";
import { listSounds } from "../../services/soundboard";

export function createSoundboardPanel(languageKey: string) {
    const sounds = listSounds();
    const embed = new EmbedBuilder().setTitle("🎵 SOUNDBOARD").setColor(0x2ecc71);
    const closeLabel = languageKey === "id" ? "❌ Tutup" : "❌ Close";
    const controlRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(BUTTON_SOUNDBOARD_CLOSE)
            .setLabel(closeLabel)
            .setStyle(ButtonStyle.Danger)
    );

    if (sounds.length === 0) {
        embed.setDescription(
            languageKey === "id"
                ? "Belum ada audio. Tambahkan file `.mp3`/`.ogg`/`.wav` ke folder `sounds/`."
                : "No sounds yet. Add `.mp3`/`.ogg`/`.wav` files to the `sounds/` folder."
        );
        return { embeds: [embed], components: [controlRow] };
    }

    embed.setDescription(
        languageKey === "id"
            ? "Pilih suara yang ingin dimainkan di voice channel:"
            : "Choose a sound to play in the voice channel:"
    );

    const components: ActionRowBuilder<ButtonBuilder>[] = [];
    for (let i = 0; i < sounds.length; i += 5) {
        components.push(
            new ActionRowBuilder<ButtonBuilder>().addComponents(
                ...sounds.slice(i, i + 5).map((s) =>
                    new ButtonBuilder()
                        .setCustomId(`${BUTTON_SOUND_PREFIX}${s.value}`)
                        .setLabel(s.name)
                        .setStyle(ButtonStyle.Success)
                )
            )
        );
        if (components.length >= 4) break;
    }
    components.push(controlRow);
    return { embeds: [embed], components };
}

export async function soundboard(interaction: ChatInputCommandInteraction, _scope: Scope) {
    const config = await configRepo.get(interaction.guildId!);
    await interaction.editReply(createSoundboardPanel(config.languageKey));
}
