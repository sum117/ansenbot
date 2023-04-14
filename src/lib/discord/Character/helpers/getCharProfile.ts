import type { BaseMessageOptions, User } from "discord.js";

import CharacterFetcher from "../../../pocketbase/CharacterFetcher";
import CharacterPost from "../classes/CharacterPost";

export default async function getCharProfile(user: User): Promise<BaseMessageOptions> {
  const characterFetcher = new CharacterFetcher();
  const player = await characterFetcher.getPlayerById(user.id);
  if (!player) {
    throw new Error("Usuário não encontrado.");
  }
  if (!player.currentCharacterId) {
    throw new Error("Usuário não possui personagem selecionado.");
  }

  const characterData = await characterFetcher.getCharacterById(player.currentCharacterId);
  const characterPost = new CharacterPost(characterData);
  const messageOptions = await characterPost.createMessageOptions({
    to: "profile",
  });

  return messageOptions;
}
