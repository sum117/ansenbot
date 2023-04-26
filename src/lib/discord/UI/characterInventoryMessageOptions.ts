import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { Character } from "../../../types/Character";

export interface CharacterInventoryMessageOptions {
  character: Character;
  itemsStringArray: string[];
  counters: {
    consumable: number;
    equipment: number;
    spell: number;
  };
  previousPage: number;
  nextPage: number;
}

export default function characterInventoryMessageOptions({
  character,
  itemsStringArray,
  counters,
  previousPage,
  nextPage,
}: CharacterInventoryMessageOptions) {
  const embed = new EmbedBuilder()
    .setTitle(`Inventário de ${character.name}`)
    .setDescription(itemsStringArray.join("\n"))
    .setColor(character.expand.race[0].color)
    .addFields(
      { name: "Consumíveis", value: counters.consumable.toString(), inline: true },
      { name: "Equipamentos", value: counters.equipment.toString(), inline: true },
      { name: "Feitiços", value: counters.spell.toString(), inline: true }
    );

  const pageButtons = new ActionRowBuilder<ButtonBuilder>().setComponents([
    new ButtonBuilder()
      .setCustomId(`character:inventory:${previousPage}:${character.playerId}`)
      .setLabel("Página Anterior")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`character:inventory:${nextPage}:${character.playerId}`)
      .setLabel("Próxima Página")
      .setStyle(ButtonStyle.Secondary),
  ]);

  return { embeds: [embed], components: [pageButtons] };
}
