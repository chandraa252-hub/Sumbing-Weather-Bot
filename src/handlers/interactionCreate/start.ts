import { type Scope } from "@sentry/node";
import { ChatInputCommandInteraction, Guild, GuildMember, TextChannel } from "discord.js";
import { configRepo } from "../../persistence";
import { timerRepo } from "../../persistence";
import logger from "../../services/logger";
import { getInviteUrl, hasVoicePermissions } from "../../services/permissions";
import { addTimer } from "../../services/timer";
import { getVoiceConnection } from "../../util/getVoiceConnection";

async function resolveGuildMember(guild: Guild, interaction: ChatInputCommandInteraction): Promise<GuildMember | null> {
    const member = interaction.member;
    if (member instanceof GuildMember) {
        return member;
    }

    try {
        return await guild.members.fetch(interaction.user.id);
    } catch {
        return null;
    }
}

export async function start(interaction: ChatInputCommandInteraction, scope: Scope) {
    const guild = interaction.guild!;
    const guildId = guild.id;

    const [timerRunning, config] = await Promise.all([timerRepo.exists(guildId), configRepo.get(guildId)]);

    if (timerRunning) {
        logger.info(guildId, "Timer is already running");
        await interaction.editReply("Timer is already running");
        return;
    }

    if (!hasVoicePermissions(guild)) {
        const invite = getInviteUrl();
        await interaction.editReply(
            `I don't have enough permissions to join the voice channel. Please use this link to grant more permissions: <${invite}>.`
        );
        return;
    }

    const member = await resolveGuildMember(guild, interaction);
    if (!member?.voice.channel) {
        await interaction.editReply(
            `I don't know which voice channel to join. Join a voice channel and run \`/weather start\` again.`
        );
        return;
    }

    const channel = interaction.channel as TextChannel;

    await interaction.editReply("Timer started");

    await Promise.all([getVoiceConnection(config, member, guild), addTimer(guildId, channel, scope)]);
}
