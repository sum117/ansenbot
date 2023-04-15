import type { BaseMessageOptions, User } from "discord.js";

import { BotError } from "../../../../utils/Errors";
import CharacterFetcher from "../../../pocketbase/CharacterFetcher";
import PlayerFetcher from "../../../pocketbase/PlayerFetcher";
import CharacterPost from "../classes/CharacterPost";

export default async function getCharProfile(user: User): Promise<BaseMessageOptions> {
  const player = await PlayerFetcher.getPlayerById(user.id);
  if (!player) {
    throw new BotError("Usuário não encontrado.");
  }
  if (!player.currentCharacterId) {
    throw new BotError("Usuário não possui personagem selecionado.");
  }

  const characterData = await CharacterFetcher.getCharacterById(player.currentCharacterId);
  const characterPost = new CharacterPost(characterData);
  const messageOptions = await characterPost.createMessageOptions({
    to: "profile",
  });

  return messageOptions;
}
