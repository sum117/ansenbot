import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { Character } from "../../../types/Character";
import { ITEM_ACTIONS, ITEM_TYPES } from "../../../data/constants";

export interface CharacterInventoryMessageOptions {
  character: Character;
  itemsString: string;
  counters: {
    consumable: number;
    equipment: number;
    spell: number;
  };
  currentPage: number;
  kind: keyof typeof ITEM_TYPES;
  previousItemId: string;
  selectedItemId: string;
  nextItemId: string;
  previousPage: number;
  nextPage: number;
}

export default function characterInventoryMessageOptions({
  character,
  itemsString,
  counters,
  previousPage,
  nextPage,
  kind,
  previousItemId,
  nextItemId,
  currentPage,
  selectedItemId,
}: CharacterInventoryMessageOptions) {
  const embed = new EmbedBuilder()
    .setTitle(`Inventário de ${character.name}`)
    .setDescription(itemsString)
    .setColor(character.expand.race[0].color)
    .addFields(
      { name: "Consumíveis", value: counters.consumable.toString(), inline: true },
      { name: "Equipamentos", value: counters.equipment.toString(), inline: true },
      { name: "Feitiços", value: counters.spell.toString(), inline: true }
    );
  const itemControls = new ActionRowBuilder<ButtonBuilder>().setComponents([
    new ButtonBuilder()
      .setEmoji("⬆️")
      .setLabel("Item Anterior")
      .setCustomId(
        `character:item:browse:${previousItemId}:${character.playerId}:${currentPage}:previous`
      )
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setLabel(ITEM_ACTIONS[kind])
      .setCustomId(`character:item:use:${selectedItemId}:${character.playerId}:${currentPage}:null`)
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setLabel("Descartar")
      .setCustomId(
        `character:item:discard:${selectedItemId}:${character.playerId}:${currentPage}:null`
      )
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setEmoji("⬇️")
      .setLabel("Próximo Item")
      .setCustomId(`character:item:browse:${nextItemId}:${character.playerId}:${currentPage}:next`)
      .setStyle(ButtonStyle.Primary),
  ]);
  const pageButtons = new ActionRowBuilder<ButtonBuilder>().setComponents([
    new ButtonBuilder()
      .setCustomId(
        `character:inventory:browse:${selectedItemId}:${character.playerId}:${previousPage}:previous`
      )
      .setLabel("Página Anterior")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(
        `character:inventory:browse:${selectedItemId}:${character.playerId}:${nextPage}:next`
      )
      .setLabel("Próxima Página")
      .setStyle(ButtonStyle.Secondary),
  ]);

  return { embeds: [embed], components: [itemControls, pageButtons] };
}
