import type { AutocompleteInteraction, User } from "discord.js";
import type { RecordFullListQueryParams } from "pocketbase";

import CharacterFetcher from "../../../pocketbase/CharacterFetcher";

export function characterAutoCompleteFromPlayer(
  interaction: AutocompleteInteraction,
  user?: User
): void {
  const userInput = interaction.options.getFocused();
  CharacterFetcher.getCharactersByPlayerId({
    playerId: user ? user.id : interaction.user.id,
    page: 1,
  }).then((characters) => {
    const choices = characters.items
      .filter((character) => character.name.includes(userInput))
      .map((character) => ({
        name: character.name,
        value: character.id,
      }));

    interaction.respond(choices);
  });
}

export function characterAutoCompleteFromAll(interaction: AutocompleteInteraction): void {
  const userInput = interaction.options.getFocused();
  const respond = ({ query: filter }: { query?: RecordFullListQueryParams } = {}) =>
    CharacterFetcher.getAllCharacters({ filter }).then((characters) => {
      const choices = characters.items.map((character) => ({
        name: character.name,
        value: character.id,
      }));

      interaction.respond(choices);
    });

  if (!userInput) {
    void respond();
    return;
  }
  void respond({
    query: {
      filter: `name~"${userInput}"`,
    },
  });
}
