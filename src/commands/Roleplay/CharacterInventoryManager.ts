import { ButtonComponent, Discord } from "discordx";
import { ButtonInteraction, ButtonStyle, Snowflake } from "discord.js";
import handleError from "../../utils/handleError";
import mustache from "mustache";
import { ItemFetcher } from "../../lib/pocketbase/ItemFetcher";
import sortInventoryItems from "../../lib/discord/UI/helpers/sortInventoryItems";
import makeInventoryStringArray from "../../lib/discord/UI/helpers/makeInventoryStringArray";
import getRoleplayDataFromUserId from "../../lib/discord/Character/helpers/getRoleplayDataFromUserId";
import countInventoryItemsReducer from "../../lib/discord/UI/helpers/countInventoryItems";
import characterInventoryMessageOptions from "../../lib/discord/UI/characterInventoryMessageOptions";
import { Character, InventoryItem } from "../../types/Character";
import { ListResult } from "pocketbase";

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

      const inventory = await ItemFetcher.getCharacterInventory(currentCharacter.id);
      const inventoryMessage = this.prepareInventoryMessage(inventory);
      const counters = this.calculateInventoryCounters(inventory);
      const { previousPage, nextPage } = this.calculatePageBounds(inventory);

      const inventoryMessageOptions = characterInventoryMessageOptions({
        character: currentCharacter,
        itemsStringArray: inventoryMessage,
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

  private prepareInventoryMessage(inventory: ListResult<InventoryItem>): string[] {
    return inventory.items
      .sort(sortInventoryItems)
      .map(makeInventoryStringArray)
      .filter((itemString): itemString is string => Boolean(itemString));
  }

  private calculateInventoryCounters(inventory: ListResult<InventoryItem>): {
    consumable: number;
    equipment: number;
    spell: number;
  } {
    return inventory.items.reduce(countInventoryItemsReducer, {
      consumable: 0,
      equipment: 0,
      spell: 0,
    });
  }

  private calculatePageBounds(inventory: ListResult<InventoryItem>): {
    previousPage: number;
    nextPage: number;
  } {
    const previousPage = Math.max(0, inventory.page - 1);
    const nextPage = Math.min(inventory.totalPages, inventory.page + 1);

    return { previousPage, nextPage };
  }
}
