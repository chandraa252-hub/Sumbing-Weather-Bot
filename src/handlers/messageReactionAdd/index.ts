import { MessageReaction, PartialUser, User } from "discord.js";
import { HandlerProps } from "../../services/sentry";

export async function handleMessageReactionAdd({
    args: [_messageReaction, _user],
}: HandlerProps<[MessageReaction, User | PartialUser]>) {
    // Buttons are used instead of reactions — no action needed here
}
