import { bold } from "discord.js";

import { skillsDictionary } from "../../../../data/translations";
import type { Character } from "../../../../types/Character";
import getSafeEntries from "../../../../utils/getSafeEntries";
import removePocketbaseConstants from "../../../../utils/removePocketbaseConstants";

export default function getCharSkillStringArray(
  character: Character,
  skillIdToSelect: string
): Array<string> {
  return getSafeEntries(removePocketbaseConstants(character.expand.skills))
    .filter((entries): entries is [keyof typeof skillsDictionary, number] => {
      const [skillId] = entries;
      return skillId in skillsDictionary;
    })
    .sort(([keyA], [keyB]) => {
      const skillA = skillsDictionary[keyA];
      const skillB = skillsDictionary[keyB];
      return skillA.localeCompare(skillB);
    })
    .map(([name, level]) => {
      return `${bold(skillsDictionary[name])}: ${level} ${name === skillIdToSelect ? "💠" : ""}`;
    });
}
