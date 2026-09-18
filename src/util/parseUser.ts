import { MessageMentions } from "discord.js";
import type { Guild } from "discord.js";

interface ParsedUser {
    name: string;
    userId: string | undefined;
}

export default async function parseUser(s: string, guild: Guild): Promise<ParsedUser> {
    const match = MessageMentions.UsersPattern.exec(s);
    if (match?.groups?.id) {
        const userId = match.groups.id;
        const guildMember = await guild.members.fetch(userId);
        return {
            name: guildMember?.displayName ?? s,
            userId,
        };
    }

    return {
        name: s,
        userId: undefined,
    };
}