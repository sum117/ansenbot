import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

import type { Character } from "../../../../types/Character";

const characterApprovalBtnRow = (character: Character): ActionRowBuilder<ButtonBuilder> =>
  new ActionRowBuilder<ButtonBuilder>().setComponents(
    new ButtonBuilder()
      .setCustomId(`character:approve:${character.id}:${character.playerId}`)
      .setLabel("Aprovar")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`character:deny:${character.id}:${character.playerId}`)
      .setLabel("Rejeitar")
      .setStyle(ButtonStyle.Danger)
  );

export default characterApprovalBtnRow;
