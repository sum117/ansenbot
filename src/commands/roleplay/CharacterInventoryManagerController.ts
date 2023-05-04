import type { ButtonInteraction} from "discord.js";
import { ButtonStyle, userMention } from "discord.js";
import { ButtonComponent, Discord } from "discordx";
import mustache from "mustache";

import getRoleplayDataFromUserId from "../../lib/discord/Character/helpers/getRoleplayDataFromUserId";
import characterInventoryMessageOptions from "../../lib/discord/UI/character/characterInventoryMessageOptions";
import getItemInfoEmbed from "../../lib/discord/UI/helpers/getItemInfoEmbed";
import makeInventoryStringArray from "../../lib/discord/UI/helpers/makeInventoryStringArray";
import { ItemFetcher } from "../../lib/pocketbase/ItemFetcher";
import { equipmentSchema, spellSchema } from "../../schemas/characterSchema";
import type { Character } from "../../types/Character";
import handleError from "../../utils/handleError";
import TrackedInteraction from "../../utils/TrackedInteraction";

// placeholder:action:kind:itemId:playerId:page:(previous|next)
const INVENTORY_REGEX =
  /character:(inventory|item):(browse|use|discard|open|equip|info):(\w+):\d+(:\d+:(previous|next|null))?/;

@Discord()
export class CharacterInventoryManagerController {
  private trackedInteraction = new TrackedInteraction();

  @ButtonComponent({ id: INVENTORY_REGEX })
  public async inventoryButton(interaction: ButtonInteraction) {
    try {
      const { itemId, page, kind, playerId } = this.getInventoryCredentialsFromCustomId(interaction);

      let useItemAction = "";
      switch (kind) {
        case "use": {
          useItemAction = await this.useItemInteraction(interaction);
          break;
        }
        case "equip": {
          useItemAction = await this.equipItemInteraction(interaction);
          break;
        }
        case "discard": {
          useItemAction = await this.discardItemInteraction(interaction);
          break;
        }
        case "info": {
          const embed = await this.inspectItemInteraction(interaction);
          if (embed) {
            return interaction.reply({ embeds: [embed] });
          } else {
            useItemAction = "❌ Houve um erro ao tentar inspecionar o item.";
          }
          break;
        }
      }

      const { currentCharacter, view } = await getRoleplayDataFromUserId(playerId);
      const itemsArray = [
        ...(currentCharacter.expand.inventory.expand.consumables ?? []),
        ...(currentCharacter.expand.inventory.expand.equipments ?? []),
        ...(currentCharacter.expand.inventory.expand.spells ?? []),
      ];

      const trackedInteraction = await this.trackedInteraction.getOrCreateTrackedInteraction(
        interaction
      );
      if (await this.handleEmptyInventory(currentCharacter, trackedInteraction, view)) {
        return;
      }

      const PAGE_SIZE = 5;
      // TODO: refactor this into a function "makePagination" and include getPageItems from this class to it.
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

      await trackedInteraction.editReply({
        content: useItemAction,
        ...messageOptions,
      });
    } catch (error) {
      handleError(interaction, error);
    }
  }

  private async useItemInteraction(interaction: ButtonInteraction) {
    const { itemId, playerId } = this.getInventoryCredentialsFromCustomId(interaction);
    if (interaction.user.id !== playerId) {
      return "❌ Você não pode equipar itens de outros jogadores dessa forma.";
    }
    const { characterManager } = await getRoleplayDataFromUserId(playerId);

    const feedback = await characterManager.use(itemId);
    return feedback;
  }

  private async equipItemInteraction(interaction: ButtonInteraction) {
    const { itemId, playerId } = this.getInventoryCredentialsFromCustomId(interaction);
    if (interaction.user.id !== playerId) {
      return "❌ Você não pode usar itens de outros jogadores.";
    }
    const { characterManager } = await getRoleplayDataFromUserId(playerId);

    const item = equipmentSchema
      .or(spellSchema)

      .parse(await characterManager.getInventoryItem(itemId));

    const view = {
      author: userMention(characterManager.character.playerId),
      item: item.expand.item.name,
    };
    await characterManager.setEquipment(item);
    const equipment = await characterManager.getEquipmentItem(item.slot);
    if (!equipment) {
      return mustache.render(
        "✅ {{{author}}}, seu personagem desequipou o item {{{item}}} com sucesso!",
        view
      );
    }
    return mustache.render(
      "✅ {{{author}}}, seu personagem equipou o item {{{item}}} com sucesso!",
      view
    );
  }

  private async inspectItemInteraction(interaction: ButtonInteraction) {
    const { itemId, playerId } = this.getInventoryCredentialsFromCustomId(interaction);
    const { currentCharacter } = await getRoleplayDataFromUserId(playerId);

    const itemsArray = [
      ...(currentCharacter.expand.inventory.expand.consumables ?? []),
      ...(currentCharacter.expand.inventory.expand.equipments ?? []),
      ...(currentCharacter.expand.inventory.expand.spells ?? []),
    ];

    const itemsTableId = itemsArray.find(({ id }) => itemId === id)?.item;

    if (!itemsTableId) {
      return;
    }

    const item = await ItemFetcher.getItemWithRole(itemsTableId);
    const embed = getItemInfoEmbed(item, currentCharacter.name);
    return embed;
  }

  private async discardItemInteraction(interaction: ButtonInteraction) {
    const { itemId, playerId } = this.getInventoryCredentialsFromCustomId(interaction);
    const { characterManager } = await getRoleplayDataFromUserId(playerId);
    if (interaction.user.id !== playerId) {
      return "❌ Você não pode descartar itens de outros jogadores.";
    }
    const feedback = await characterManager.discard(itemId);
    return feedback;
  }

  private getPageItems<T extends Array<any>>(
    itemsArray: T,
    currentPage: number,
    PAGE_SIZE: number
  ): T[number][] {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const endIndex = startIndex + PAGE_SIZE;
    let pageItems = itemsArray.slice(startIndex, endIndex).filter((item) => Boolean(item));
    if (!pageItems.length) {
      pageItems = itemsArray.slice(0, PAGE_SIZE).filter((item) => Boolean(item));
    }
    return pageItems;
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
      this.trackedInteraction.cache.delete(trackedInteraction.user.id);
      return true;
    }
    return false;
  }

  private getInventoryCredentialsFromCustomId(interaction: ButtonInteraction) {
    const [_, action, kind, itemId, playerId, page] = interaction.customId.split(":") as [
      "character",
      "inventory" | "item",
      "browse" | "use" | "discard" | "open" | "equip" | "info",
      string,
      string,
      string | undefined
    ];
    return { itemId, page, action, kind, playerId };
  }
}
