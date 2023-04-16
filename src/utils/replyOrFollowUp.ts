import type {
  ButtonInteraction,
  ChatInputCommandInteraction,
  InteractionReplyOptions,
  ModalSubmitInteraction,
  StringSelectMenuInteraction,
} from "discord.js";

export default async function replyOrFollowUp(
  interaction:
    | ChatInputCommandInteraction
    | ModalSubmitInteraction
    | ButtonInteraction
    | StringSelectMenuInteraction,
  replyOptions:
    | (InteractionReplyOptions & {
        ephemeral?: boolean;
      })
    | string
): Promise<void> {
  // if interaction is already replied
  if (interaction.replied) {
    await interaction.followUp(replyOptions);
    return;
  }

  // if interaction is deferred but not replied
  if (interaction.deferred) {
    await interaction.editReply(replyOptions);
    return;
  }

  // if interaction is not handled yet
  await interaction.reply(replyOptions);
}
