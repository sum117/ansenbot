import type { CommandInteraction } from "discord.js";
import { ApplicationCommandOptionType } from "discord.js";
import type { SlashOptionOptions } from "discordx";
import { Discord, Slash, SlashOption } from "discordx";

import CharacterFetcher from "../../lib/pocketbase/CharacterFetcher";
import type { Player } from "../../types/Character";

const characterFetcher = new CharacterFetcher();
const characterSetChoice: SlashOptionOptions<"personagem", "O personagem que você deseja setar."> =
  {
    required: true,
    description: "O personagem que você deseja setar.",
    name: "personagem",
    type: ApplicationCommandOptionType.String,
    autocomplete(interaction) {
      const userInput = interaction.options.getFocused();
      characterFetcher.getAllCharactersFromPlayer(interaction.user.id).then((characters) => {
        const choices = characters
          .filter((character) => character.name.includes(userInput))
          .map((character) => ({
            name: character.name,
            value: character.id,
          }));

        interaction.respond(choices);
      });
    },
  };

@Discord()
export class PlayerManager {
  @Slash({
    description: "Seta o seu personagem principal.",
    name: "setar-personagem",
  })
  async setMainCharacter(
    @SlashOption(characterSetChoice)
    characterId: string,
    interaction: CommandInteraction
  ): Promise<void> {
    const character = await characterFetcher.getCharacterById(characterId);
    const player = await characterFetcher.getPlayerById(interaction.user.id);
    player.currentCharacterId = character.id;

    const updatedPlayer = await characterFetcher.updateEntity<Player>(player).catch((error) => {
      void interaction.reply({
        content: "Ocorreu um erro ao tentar setar o seu personagem principal.",
        ephemeral: true,
      });
      console.error(error);
      return null;
    });

    if (!updatedPlayer) {
      return;
    }

    void interaction.reply({
      content: `Seu personagem principal foi setado para ${character.name}.`,
      ephemeral: true,
    });
  }
}
