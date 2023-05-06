import type { ButtonInteraction } from "discord.js";
import { userMention } from "discord.js";
import { ButtonComponent, Discord } from "discordx";
import mustache from "mustache";

import { INVENTORY_REGEX } from "../../data/constants";
import getRoleplayDataFromUserId from "../../lib/discord/Character/helpers/getRoleplayDataFromUserId";
import characterInventoryMessageOptions from "../../lib/discord/UI/character/characterInventoryMessageOptions";
import getItemInfoEmbed from "../../lib/discord/UI/helpers/getItemInfoEmbed";
import makeInventoryStringArray from "../../lib/discord/UI/helpers/makeInventoryStringArray";
import { ItemFetcher } from "../../lib/pocketbase/ItemFetcher";
import { equipmentSchema, spellSchema } from "../../schemas/characterSchema";
import type { Character } from "../../types/Character";
import handleError from "../../utils/handleError";
import makeXYPagination from "../../utils/makeXandYPagination";
import TrackedInteraction from "../../utils/TrackedInteraction";

// placeholder:action:kind:itemId:playerId:page:(previous|next)

@Discord()
export class CharacterInventoryManagerController {
  private trackedInteraction = new TrackedInteraction();

  @ButtonComponent({ id: INVENTORY_REGEX })
  public async inventoryButton(interaction: ButtonInteraction): Promise<void> {
    try {
      const { itemId, page, kind, playerId } =
        this.getInventoryCredentialsFromCustomId(interaction);

      if (this.inventoryAlreadyOpen(interaction, playerId)) {
        await interaction
          .reply({
            content: "❌ Você já possui um inventário aberto.",
            ephemeral: true,
          })
          .catch(() => null);
        return;
      }

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
            await interaction.reply({ embeds: [embed] });
            return;
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
        interaction,
        "inventory:open"
      );
      if (await this.handleEmptyInventory(currentCharacter, trackedInteraction, view)) {
        return;
      }

      const PAGE_SIZE = 5;
      const {
        pageItems,
        nextPage,
        selectedItemId,
        previousItemId,
        previousPage,
        nextItemId,
        currentPage,
        currentlySelectedItem,
      } = makeXYPagination({
        pageSize: PAGE_SIZE,
        itemsArray,
        pageFromCustomId: page,
        itemIdFromCustomId: itemId,
      });

      const inventoryString = makeInventoryStringArray(pageItems, selectedItemId);
      const options: Parameters<typeof characterInventoryMessageOptions>[0] = {
        character: currentCharacter,
        previousItemId,
        nextItemId,
        selectedItemId,
        kind: currentlySelectedItem.expand.item.type,
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

    return characterManager.use(itemId);
  }

  private inventoryAlreadyOpen(interaction: ButtonInteraction, playerId: string) {
    const isDifferentUser = interaction.user.id !== playerId;
    const cachedInteraction = this.trackedInteraction.cache.get(interaction.user.id);
    const isSameTargetPlayer = cachedInteraction?.customId.includes(playerId);

    return Boolean(
      isDifferentUser &&
        cachedInteraction &&
        !interaction.customId.includes("open") &&
        !isSameTargetPlayer
    );
  }

  private async equipItemInteraction(interaction: ButtonInteraction) {
    const { itemId, playerId } = this.getInventoryCredentialsFromCustomId(interaction);
    if (interaction.user.id !== playerId) {
      return "❌ Você não pode usar itens de outros jogadores.";
    }
    const { characterManager } = await getRoleplayDataFromUserId(playerId);

    const data = await characterManager.getInventoryItem(itemId);
    const item = equipmentSchema.or(spellSchema).parse(data);

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
    const { currentCharacter, characterManager } = await getRoleplayDataFromUserId(playerId);

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
    return getItemInfoEmbed(item, characterManager);
  }

  private async discardItemInteraction(interaction: ButtonInteraction) {
    const { itemId, playerId } = this.getInventoryCredentialsFromCustomId(interaction);
    const { characterManager } = await getRoleplayDataFromUserId(playerId);
    if (interaction.user.id !== playerId) {
      return "❌ Você não pode descartar itens de outros jogadores.";
    }
    return characterManager.discard(itemId);
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
      await trackedInteraction.editReply({
        content: mustache.render(
          "{{{author}}}, o personagem **{{{character}}}** não possui itens no inventário.",
          view
        ),
      });
      // delay for 5 seconds before deleting the message
      await new Promise((resolve) => {
        setTimeout(resolve, 5000);
      });
      await trackedInteraction.deleteReply().catch(() => null);
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
