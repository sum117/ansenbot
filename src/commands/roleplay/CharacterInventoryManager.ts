import { ButtonComponent, Discord } from "discordx";
import { ButtonInteraction, ButtonStyle, Snowflake } from "discord.js";
import handleError from "../../utils/handleError";
import mustache from "mustache";
import getRoleplayDataFromUserId from "../../lib/discord/Character/helpers/getRoleplayDataFromUserId";
import { Character } from "../../types/Character";
import characterInventoryMessageOptions from "../../lib/discord/UI/characterInventoryMessageOptions";
import makeInventoryStringArray from "../../lib/discord/UI/helpers/makeInventoryStringArray";

// placeholder:action:kind:itemId:playerId:page:(previous|next)
const INVENTORY_REGEX =
  /character:(inventory|item):(browse|use|discard|open):(\w+):\d+(:\d+:(previous|next|null))?/;

@Discord()
export class CharacterInventoryManager {
  private trackedInteraction = new Map<Snowflake, ButtonInteraction>();

  @ButtonComponent({ id: INVENTORY_REGEX })
  public async inventoryButton(interaction: ButtonInteraction) {
    try {
      let [_, action, kind, itemId, playerId, page] = interaction.customId.split(":") as [
        "character",
        "inventory" | "item",
        "browse" | "use" | "discard" | "open",
        string,
        string,
        string | undefined
      ];
      const trackedInteraction = await this.getOrCreateTrackedInteraction(interaction);

      if (this.shouldAbortInteraction(trackedInteraction, interaction)) {
        return;
      }
      const { currentCharacter, view } = await getRoleplayDataFromUserId(interaction);
      if (await this.handleEmptyInventory(currentCharacter, trackedInteraction, view)) {
        return;
      }

      const PAGE_SIZE = 5;
      const itemsArray = [
        ...(currentCharacter.expand.inventory.expand.consumables ?? []),
        ...(currentCharacter.expand.inventory.expand.equipments ?? []),
        ...(currentCharacter.expand.inventory.expand.spells ?? []),
      ];
      const totalPages = Math.ceil(itemsArray.length / PAGE_SIZE);
      const currentPage = page ? parseInt(page) : 1;
      const previousPage = Math.max(0, currentPage - 1);
      const nextPage = Math.min(totalPages, currentPage + 1);
      const pageItems = this.getPageItems(itemsArray, currentPage, PAGE_SIZE);

      const foundItem = pageItems.find((item) => item.id === itemId) ?? pageItems[0];
      const selectedItemId = foundItem.id;
      const itemIndex = pageItems.findIndex((item) => item.id === foundItem.id);
      const previousItemId = pageItems.at(itemIndex - 1)?.id ?? pageItems.at(-1)?.id;
      const nextItemId = pageItems.at(itemIndex + 1)?.id ?? pageItems.at(0)?.id;

      if (!previousItemId || !nextItemId) {
        return;
      }

      const inventoryString = makeInventoryStringArray(pageItems, selectedItemId);
      const options: Parameters<typeof characterInventoryMessageOptions>[0] = {
        character: currentCharacter,
        previousItemId,
        nextItemId,
        selectedItemId,
        kind: foundItem.expand.item.type,
        nextPage,
        currentPage,
        previousPage,
        counters: {
          consumable: currentCharacter.expand.inventory.consumables.length,
          equipment: currentCharacter.expand.inventory.equipments.length,
          spell: currentCharacter.expand.inventory.spells.length,
        },
        itemsString: inventoryString.join("\n"),
      };

      const messageOptions = characterInventoryMessageOptions(options);
      await trackedInteraction.editReply(messageOptions);
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

  private getPageItems<T extends Array<any>>(
    itemsArray: T,
    currentPage: number,
    PAGE_SIZE: number
  ) {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const endIndex = startIndex + PAGE_SIZE;
    let pageItems = itemsArray.slice(startIndex, endIndex).filter((item) => Boolean(item));
    if (!pageItems.length) {
      pageItems = itemsArray.slice(0, PAGE_SIZE).filter((item) => Boolean(item));
    }
    return pageItems as T extends Array<infer U> ? Array<U> : never;
  }

  private async handleEmptyInventory(
    currentCharacter: Character,
    trackedInteraction: ButtonInteraction,
    view: Record<string, string | number>
  ): Promise<boolean> {
    const length =
      currentCharacter.expand.inventory.consumables.length +
      currentCharacter.expand.inventory.equipments.length +
      currentCharacter.expand.inventory.spells.length;
    if (length === 0) {
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
