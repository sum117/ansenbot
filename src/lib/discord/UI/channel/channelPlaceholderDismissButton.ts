import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

const channelPlaceholderDismissButton = new ActionRowBuilder<ButtonBuilder>().setComponents(
  new ButtonBuilder()
    .setCustomId("dismissPresentation")
    .setStyle(ButtonStyle.Primary)
    .setLabel("Ignorar")
    .setEmoji("👋")
);

export default channelPlaceholderDismissButton;
