import type {
  ButtonInteraction,
  ChatInputCommandInteraction,
  ModalSubmitInteraction,
} from "discord.js";
import { ButtonComponent, Discord, ModalComponent, Slash } from "discordx";

import { GACHA_ID_REGEX, GACHA_MODAL_ID_REGEX } from "../../data/constants";
import getRoleplayDataFromUserId from "../../lib/discord/Character/helpers/getRoleplayDataFromUserId";
import GachaItemBuilder from "../../lib/discord/GameSystems/GachaItemMaker";
import type MultiForm from "../../lib/discord/UI/classes/MultiForm";
import getItemInfoEmbed from "../../lib/discord/UI/helpers/getItemInfoEmbed";
import { gachaItemKeepModal } from "../../lib/discord/UI/items/gachaItemKeepModal";
import { gachaItemsMessageOptions } from "../../lib/discord/UI/items/gachaItemsMessageOptions";
import { ItemFetcher } from "../../lib/pocketbase/ItemFetcher";
import type { GachaParam } from "../../types/Item";
import handleError from "../../utils/handleError";

@Discord()
export class ItemRollController {
  private gachaItemBuilder = new GachaItemBuilder();
  @Slash({
    name: "item_roll",
    description: "Role um item utilizando lascas espirituais.",
  })
  public async main(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      if (!(await this.canRoll(interaction))) {
        await interaction.reply("Você não tem lascas espirituais suficientes.");
        return;
      }
      const messageOptions = await this.generateRollMessage(interaction);
      await interaction.reply({ ...messageOptions, fetchReply: true });
    } catch (error) {
      handleError(interaction, error);
    }
  }

  @ButtonComponent({ id: GACHA_ID_REGEX })
  public async gachaButton(interaction: ButtonInteraction): Promise<void> {
    try {
      const player = this.gachaItemBuilder.get(interaction.user.id);
      if (!player) {
        await interaction.reply(
          "Esse canalizador de items é antigo ou não lhe pertence. Use o comando novamente."
        );
        return;
      }
      const param = this.getInteractionParam(interaction);
      if (param === "keep") {
        await interaction.showModal(gachaItemKeepModal);
        return;
      }

      if (!(await this.canRoll(interaction))) {
        await interaction.reply("Você não tem lascas espirituais suficientes.");
        return;
      }

      await interaction.deferUpdate();
      const messageOptions = await this.generateRollMessage(interaction);
      await interaction.editReply(messageOptions);
    } catch (error) {
      handleError(interaction, error);
    }
  }

  @ModalComponent({ id: GACHA_MODAL_ID_REGEX })
  public async gachaModal(interaction: ModalSubmitInteraction): Promise<void> {
    try {
      const [name, description] = ["gacha:item:modal:name", "gacha:item:modal:description"].map(
        (id) => interaction.fields.getTextInputValue(id)
      );
      const itemRef = this.gachaItemBuilder.get(interaction.user.id);
      if (!itemRef) {
        await interaction.reply(
          "Houve um erro com esse canalizador de itens. Sentimos muito. Por favor, tente usar o comando novamente."
        );
        return;
      }
      await interaction.deferReply();

      const createdItem = await ItemFetcher.createItem({
        ...itemRef,
        name,
        description,
      });
      if (!createdItem) {
        await interaction.editReply(
          "Houve um erro com esse canalizador de itens. Sentimos muito. Por favor, tente usar o comando novamente."
        );
        return;
      }

      const { characterManager } = await getRoleplayDataFromUserId(interaction.user.id);
      await characterManager.addInventoryItem(createdItem);
      const embed = getItemInfoEmbed(createdItem, characterManager);
      await interaction.editReply({
        content: `💠 Parabéns! Você conseguiu um novo item: **${name}**`,
        embeds: [embed],
      });
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
    const param =
      customId.match(GACHA_ID_REGEX)?.groups?.param ??
      customId.match(GACHA_MODAL_ID_REGEX)?.groups?.param;
    if (!param) {
      throw new Error("Parâmetro inválido. Contate um administrador.");
    }
    return param as GachaParam;
  }

  private async canRoll(
    interaction: ButtonInteraction | ChatInputCommandInteraction
  ): Promise<boolean> {
    const { characterManager } = await getRoleplayDataFromUserId(interaction.user.id);
    let spirit = characterManager.character.expand.status.spirit;
    if (spirit < 1000) {
      return false;
    }
    spirit -= 1000;
    characterManager.setStatus({ ...characterManager.character.expand.status, spirit });
    return true;
  }
}
