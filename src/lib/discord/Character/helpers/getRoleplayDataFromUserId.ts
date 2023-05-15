import { userMention } from "discord.js";

import type { Character, Skills, Status } from "../../../../types/Character.js";
import CharacterFetcher from "../../../pocketbase/CharacterFetcher";
import PlayerFetcher from "../../../pocketbase/PlayerFetcher";
import { SkillsFetcher } from "../../../pocketbase/SkillsFetcher";
import { CharacterManager } from "../classes/CharacterManager";

export interface RoleplayDataFromUserIdResult {
  character: Character;
  characterManager: CharacterManager;
  view: { character: string; level: number; author: string };
  status: Status;
  skills: Skills;
}

export default async function getRoleplayDataFromUserId(
  userId: string
): Promise<RoleplayDataFromUserIdResult> {
  const player = await PlayerFetcher.getPlayerById(userId);
  const character = await CharacterFetcher.getCharacterById(player.currentCharacterId);
  const characterManager = new CharacterManager(character);
  const view = {
    character: character.name,
    level: character.level,
    author: userMention(userId),
  };
  const [status, skills] = await Promise.all([
    characterManager.getStatuses(character.status),
    SkillsFetcher.getSkillsById(character.skills),
  ]);
  return { character, characterManager, view, status, skills };
}
