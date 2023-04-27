import { ButtonComponent, Discord } from "discordx";
import { ButtonInteraction, ButtonStyle, Snowflake } from "discord.js";
import handleError from "../../utils/handleError";
import mustache from "mustache";
import makeInventoryStringArray from "../../lib/discord/UI/helpers/makeInventoryStringArray";
import getRoleplayDataFromUserId from "../../lib/discord/Character/helpers/getRoleplayDataFromUserId";

import characterInventoryMessageOptions from "../../lib/discord/UI/characterInventoryMessageOptions";
import { Character } from "../../types/Character";

@Discord()
export class CharacterInventoryManager {
  private trackedInteraction = new Map<Snowflake, ButtonInteraction>();

  @ButtonComponent({
    id: /character:inventory:(\w+|\d+):\d+/,
  })
  public async inventoryButton(interaction: ButtonInteraction) {
    try {
      const trackedInteraction = await this.getOrCreateTrackedInteraction(interaction);

      if (this.shouldAbortInteraction(trackedInteraction, interaction)) {
        return;
      }

      const { currentCharacter, view } = await getRoleplayDataFromUserId(interaction);

      if (await this.handleEmptyInventory(currentCharacter, trackedInteraction, view)) {
        return;
      }

      const inventory = currentCharacter.expand.inventory;
      const inventoryMessage = makeInventoryStringArray(inventory);

      const charIdOrPage = interaction.customId.split(":")[2];
      const page = isNaN(parseInt(charIdOrPage)) ? 1 : parseInt(charIdOrPage);
      const pageSize = 10;
      const pageStart = (page - 1) * pageSize;
      const pageEnd = pageStart + pageSize;

      const counters = {
        consumable: inventory.consumables.length,
        equipment: inventory.equipments.length,
        spell: inventory.spells.length,
      };

      const previousPage = Math.max(0, page - 1);
      const nextPage = Math.min(Math.ceil(inventoryMessage.length / pageSize), page + 1);

      const inventoryMessageOptions = characterInventoryMessageOptions({
        character: currentCharacter,
        itemsString: inventoryMessage.slice(pageStart, pageEnd).join("\n"),
        counters,
        previousPage,
        nextPage,
      });

      return trackedInteraction.editReply(inventoryMessageOptions);
    } catch (error) {
      handleError(interaction, error);
    }
  }

  private async getOrCreateTrackedInteraction(
    interaction: ButtonInteraction
  ): Promise<ButtonInteraction> {
    let trackedInteraction = this.trackedInteraction.get(interaction.user.id);

    if (isNaN(parseInt(interaction.customId.split(":")[2])) && trackedInteraction) {
      await trackedInteraction.deleteReply();
      this.trackedInteraction.delete(interaction.user.id);
      trackedInteraction = undefined;
    }

    if (!trackedInteraction) {
      await interaction.deferReply();
      this.trackedInteraction.set(interaction.user.id, interaction);
      trackedInteraction = interaction;
    }
    return trackedInteraction;
  }

  private shouldAbortInteraction(
    trackedInteraction: ButtonInteraction,
    interaction: ButtonInteraction
  ): boolean {
    if (trackedInteraction?.id !== interaction.id) {
      void interaction.deferReply();
      void interaction.deleteReply();
      return true;
    }

    return false;
  }

  private async handleEmptyInventory(
    currentCharacter: Character,
    trackedInteraction: ButtonInteraction,
    view: Record<string, string | number>
  ): Promise<boolean> {
    if (currentCharacter.inventory.length <= 0) {
      void trackedInteraction.editReply({
        content: mustache.render(
          "{{{author}}}, o personagem **{{{character}}}** não possui itens no inventário.",
          view
        ),
      });
      // delay for 5 seconds before deleting the message
      await new Promise((resolve) => setTimeout(resolve, 5000));
      void trackedInteraction.deleteReply();
      this.trackedInteraction.delete(trackedInteraction.user.id);
      return true;
    }
    return false;
  }
}
