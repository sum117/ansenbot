import { userMention } from "discord.js";

import CharacterFetcher from "../../../pocketbase/CharacterFetcher";
import PlayerFetcher from "../../../pocketbase/PlayerFetcher";
import { SkillsFetcher } from "../../../pocketbase/SkillsFetcher";
import { CharacterManager } from "../classes/CharacterManager";

export default async function getRoleplayDataFromUserId(userId: string) {
  const player = await PlayerFetcher.getPlayerById(userId);
  const currentCharacter = await CharacterFetcher.getCharacterById(player.currentCharacterId);
  const characterManager = new CharacterManager(currentCharacter);
  const view = {
    character: currentCharacter.name,
    level: currentCharacter.level,
    author: userMention(userId),
  };
  const [status, skills] = await Promise.all([
    characterManager.getStatuses(currentCharacter.status),
    SkillsFetcher.getSkillsById(currentCharacter.skills),
  ]);
  return { currentCharacter, characterManager, view, status, skills };
}
