import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { Character } from "../../../types/Character";

export interface CharacterInventoryMessageOptions {
  character: Character;
  itemsString: string;
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
  itemsString,
  counters,
  previousPage,
  nextPage,
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
