import type { AutocompleteInteraction, User } from "discord.js";

import CharacterFetcher from "../../../pocketbase/CharacterFetcher";

const characterFetcher = new CharacterFetcher();
export function characterAutoCompleteFromPlayer(
  interaction: AutocompleteInteraction,
  user?: User
): void {
  const userInput = interaction.options.getFocused();
  characterFetcher
    .getAllCharactersFromPlayer(user ? user.id : interaction.user.id)
    .then((characters) => {
      const choices = characters
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
  const respond = ({ filter, page }: { filter?: string; page?: number } = {}) =>
    characterFetcher
      .getAllCharacters({
        filter: filter ?? "",
        page: page ?? 1,
        perPage: 10,
      })
      .then((characters) => {
        const choices = characters.map((character) => ({
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
    filter: `name~"${userInput}"`,
  });
}
