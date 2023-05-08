import { ButtonBuilder, ButtonStyle } from "discord.js";

import type { Character } from "../../../../types/Character";
import MultiForm from "../classes/MultiForm";
import getCharSkillStringArray from "../helpers/getCharSkillStringArray";

export const charLevelingIdPrefix = "character:leveling";

export interface CharacterLevelingFormOptions {
  character: Character;
  previousSkillId: string;
  nextSkillId: string;
  skillIdToSelect: string;
}

export const characterLevelingForm = (options: CharacterLevelingFormOptions): MultiForm => {
  const defaultIds = {
    previous: `${charLevelingIdPrefix}:${options.character.playerId}:${options.previousSkillId}:previous`,
    next: `${charLevelingIdPrefix}:${options.character.playerId}:${options.nextSkillId}:next`,
    level: `${charLevelingIdPrefix}:${options.character.playerId}:${options.skillIdToSelect}:level-one-time`,
    levelTenTimes: `${charLevelingIdPrefix}:${options.character.playerId}:${options.skillIdToSelect}:level-ten-times`,
  };

  const fields: Array<ButtonBuilder> = [
    new ButtonBuilder()
      .setCustomId(defaultIds.previous)
      .setLabel("Skill Anterior")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("⬆️"),
    new ButtonBuilder()
      .setCustomId(defaultIds.level)
      .setLabel("Nivelar")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("🔮")
      .setDisabled(options.character.skillPoints <= 0),
    new ButtonBuilder()
      .setCustomId(defaultIds.levelTenTimes)
      .setLabel("Nivelar 10x")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("🔮")
      .setDisabled(options.character.skillPoints <= 9),
    new ButtonBuilder()
      .setCustomId(defaultIds.next)
      .setLabel("Próximo Skill")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("⬇️"),
  ];
  const skills = getCharSkillStringArray(options.character, options.skillIdToSelect);

  return new MultiForm({
    title: `Nivelação de ${options.character.name}`,
    description: `Pontos de habilidade: ${options.character.skillPoints}\n\n${skills.join("\n")}`,
    fields,
  });
};
