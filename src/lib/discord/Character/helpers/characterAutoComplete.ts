import type { AutocompleteInteraction, User } from "discord.js";
import type { RecordFullListQueryParams } from "pocketbase";

import logger from "../../../../utils/loggerFactory";
import CharacterFetcher from "../../../pocketbase/CharacterFetcher";

export function characterAutoCompleteFromPlayer(
  interaction: AutocompleteInteraction,
  user?: User
): void {
  const userInput = interaction.options.getFocused();
  CharacterFetcher.getCharactersFromAutoComplete({
    playerId: user ? user.id : interaction.user.id,
    input: userInput,
  }).then((characters) => {
    const choices = characters.items.map((character) => ({
      name: character.name,
      value: character.id,
    }));

    interaction.respond(choices).catch(logger.error);
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

      interaction.respond(choices).catch(logger.error);
    });

  if (!userInput) {
    respond();
    return;
  }
  respond({
    query: {
      filter: `name~"${userInput}"`,
    },
  });
}
