import type { ButtonInteraction, ChatInputCommandInteraction } from "discord.js";
import { ButtonComponent, Discord, Slash } from "discordx";

import { GACHA_ID_REGEX } from "../../data/constants";
import GachaItemBuilder from "../../lib/discord/GameSystems/GachaItemMaker";
import type MultiForm from "../../lib/discord/UI/classes/MultiForm";
import type { GachaParam } from "../../lib/discord/UI/items/gachaItemsMessageOptions";
import { gachaItemsMessageOptions } from "../../lib/discord/UI/items/gachaItemsMessageOptions";
import handleError from "../../utils/handleError";

@Discord()
export class ItemRollController {
  private gachaItemBuilder = new GachaItemBuilder();
  @Slash({
    name: "item_roll",
    description: "Roll for items in a gacha styled command",
  })
  public async main(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      const messageOptions = await this.generateRollMessage(interaction);
      await interaction.reply({ ...messageOptions, fetchReply: true });
    } catch (error) {
      handleError(interaction, error);
    }
  }

  @ButtonComponent({ id: GACHA_ID_REGEX })
  public async gachaButton(interaction: ButtonInteraction): Promise<void> {
    try {
      await interaction.deferUpdate();
      const player = this.gachaItemBuilder.get(interaction.user.id);
      if (!player) {
        await interaction.editReply({
          content: "Esse é um canalizador antigo. Por favor use o comando novamente.",
          embeds: [],
          components: [],
        });
        return;
      }
      const param = this.getInteractionParam(interaction);
      const messageOptions = await this.generateRollMessage(interaction);
      await interaction.editReply(messageOptions);
      if (param === "keep") {
        await interaction.followUp({ content: "Ainda não implementado" });
      }
    } catch (error) {
      handleError(interaction, error);
    }
  }

  private async generateRollMessage(
    interaction: ChatInputCommandInteraction | ButtonInteraction
  ): Promise<MultiForm> {
    const itemPromise = this.gachaItemBuilder.roll(interaction.user.id);
    const messageOptions = await gachaItemsMessageOptions(interaction.user.id, itemPromise);
    return messageOptions;
  }
  private getInteractionParam({ customId }: ButtonInteraction): GachaParam {
    const param = customId.match(GACHA_ID_REGEX)?.groups?.param;
    if (!param) {
      throw new Error("Parâmetro inválido. Contate um administrador.");
    }
    return param as GachaParam;
  }
}
