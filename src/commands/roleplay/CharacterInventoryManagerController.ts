import type {
  BooleanCache,
  CacheType,
  EmbedBuilder,
  InteractionCollector,
  MappedInteractionTypes,
  MessageComponentType,
} from "discord.js";
import {
  ButtonInteraction,
  StringSelectMenuInteraction,
  userMention,
  UserSelectMenuInteraction,
} from "discord.js";
import { ButtonComponent, Discord } from "discordx";
import mustache from "mustache";

import { INVENTORY_REGEX, PAGE_SIZE } from "../../data/constants";
import type { CharacterManager } from "../../lib/discord/Character/classes/CharacterManager";
import getRoleplayDataFromUserId from "../../lib/discord/Character/helpers/getRoleplayDataFromUserId";
import {
  confirmButton,
  quantitySelectMenu,
  userSelectMenu,
} from "../../lib/discord/UI/character/characterInventoryGiveComponents";
import characterInventoryMessageOptions from "../../lib/discord/UI/character/characterInventoryMessageOptions";
import getItemInfoEmbed from "../../lib/discord/UI/helpers/getItemInfoEmbed";
import makeInventoryStringArray from "../../lib/discord/UI/helpers/makeInventoryStringArray";
import makeXYItemPagination from "../../lib/discord/UI/helpers/makeXYItemPagination";
import { ItemFetcher } from "../../lib/pocketbase/ItemFetcher";
import { equipmentSchema, spellSchema } from "../../schemas/characterSchema";
import type { Character } from "../../types/Character";
import handleError from "../../utils/handleError";
import TrackedInteraction from "../../utils/TrackedInteraction";

@Discord()
export class CharacterInventoryManagerController {
  private trackedInteraction = new TrackedInteraction();

  @ButtonComponent({ id: INVENTORY_REGEX })
  public async inventoryButton(interaction: ButtonInteraction): Promise<void> {
    try {
      const { itemId, page, kind, playerId } =
        this.getInventoryCredentialsFromCustomId(interaction);

      if (this.isInventoryAlreadyOpen(interaction, playerId)) {
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
        case "give": {
          if (playerId !== interaction.user.id) {
            useItemAction = "❌ Você não pode dar itens de outros jogadores.";
            break;
          }

          const { characterManager } = await getRoleplayDataFromUserId(playerId);
          const itemInfoEmbed = await this.inspectItemInteraction(interaction);
          if (!itemInfoEmbed) {
            useItemAction = "❌ Houve um erro ao tentar inspecionar o item.";
            break;
          }

          const collector = await this.getGiveActionCollector(interaction, itemInfoEmbed);
          const message = await this.handleGiveCollector(collector, characterManager, itemId);
          if (!message) {
            await interaction.followUp("❌ Houve um erro ao tentar dar o item.");
            return;
          }
          await interaction.followUp(message);
          await interaction.deleteReply();
          return;
        }
      }

      const { character: currentCharacter, view } = await getRoleplayDataFromUserId(playerId);
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

      const {
        pageItems,
        nextPage,
        selectedItemId,
        previousItemId,
        previousPage,
        nextItemId,
        currentPage,
        currentlySelectedItem,
      } = makeXYItemPagination({
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

  private isInventoryAlreadyOpen(interaction: ButtonInteraction, playerId: string) {
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
    const { character: currentCharacter, characterManager } = await getRoleplayDataFromUserId(
      playerId
    );

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

  private handleGiveCollector(
    collector: InteractionCollector<
      MappedInteractionTypes<BooleanCache<CacheType>>[MessageComponentType]
    >,
    characterManager: CharacterManager,
    itemId: string
  ): Promise<string | void> {
    return new Promise((resolve, reject) => {
      let quantity = 1;
      const selectedUserCharacterManagers = new Map<string, CharacterManager>();
      collector.on(
        "collect",
        async (i: UserSelectMenuInteraction | StringSelectMenuInteraction | ButtonInteraction) => {
          await i.deferReply({ ephemeral: true });
          if (
            i instanceof StringSelectMenuInteraction &&
            i.customId === "inventory:give:quantity"
          ) {
            quantity = Number(i.values[0]);
            await i.editReply("✅ Quantidade selecionada: " + quantity);
            return;
          }

          if (i instanceof ButtonInteraction && i.customId === "inventory:give:confirm") {
            if (!selectedUserCharacterManagers.has(i.user.id)) {
              reject("❌ Você precisa selecionar um jogador válido.");
              return;
            }

            const selectedUserCharacterManager = selectedUserCharacterManagers.get(i.user.id)!;
            const message = await characterManager.give(
              itemId,
              quantity,
              selectedUserCharacterManager
            );

            if (!message) {
              reject("❌ Houve um erro ao tentar dar o item.");
              return;
            }

            await i.deleteReply();
            await collector.removeAllListeners();
            resolve(message);
            return;
          }

          if (!(i instanceof UserSelectMenuInteraction)) {
            return;
          }

          const selectedUser = i.users.first();

          if (!selectedUser || selectedUser.bot || !selectedUser.id) {
            reject("❌ Você precisa selecionar um jogador válido.");
            return;
          }

          const data = await getRoleplayDataFromUserId(selectedUser.id).catch(() => null);

          if (!data?.characterManager) {
            reject("❌ O jogador que você escolheu não parece ter um personagem selecionado.");
            return;
          }

          const { characterManager: targetManager } = data;

          if (targetManager.character.id === characterManager.character.id) {
            reject("❌ Você não pode dar itens para você mesmo.");
            return;
          }

          selectedUserCharacterManagers.set(i.user.id, targetManager);
          await i.deleteReply();
        }
      );

      collector.on("end", (collected) => {
        if (!collected.first()) {
          reject("❌ Você não selecionou um jogador a tempo.");
        }
      });
    });
  }

  private getInventoryCredentialsFromCustomId(interaction: ButtonInteraction) {
    const [_, action, kind, itemId, playerId, page] = interaction.customId.split(":") as [
      "character",
      "inventory" | "item",
      "browse" | "use" | "discard" | "open" | "equip" | "info" | "give",
      string,
      string,
      string | undefined
    ];
    return { itemId, page, action, kind, playerId };
  }

  private async getGiveActionCollector(
    interaction: ButtonInteraction,
    itemInfoEmbed: EmbedBuilder
  ) {
    return (
      await interaction.reply({
        ephemeral: true,
        embeds: [itemInfoEmbed],
        components: [userSelectMenu, quantitySelectMenu, confirmButton],
      })
    ).createMessageComponentCollector({
      filter: (i) => i.customId.startsWith("inventory:give") && i.user.id === interaction.user.id,
      idle: 120_000,
    });
  }
}
