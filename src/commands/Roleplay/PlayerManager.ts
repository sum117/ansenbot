import type { AutocompleteInteraction, CommandInteraction, User } from "discord.js";
import { Discord, Slash, SlashOption } from "discordx";

import { characterSetChoice, characterShowChoice, userChoice } from "../../data/choices";
import CharacterPost from "../../lib/discord/Character/classes/CharacterPost";
import getCharProfile from "../../lib/discord/Character/helpers/getCharProfile";
import CharacterFetcher from "../../lib/pocketbase/CharacterFetcher";
import PlayerFetcher from "../../lib/pocketbase/PlayerFetcher";
import PocketBase from "../../lib/pocketbase/PocketBase";
import type { Player } from "../../types/Character";
import safePromise from "../../utils/safePromise";

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
    const [character, characterFetchError] = await safePromise(
      CharacterFetcher.getCharacterById(characterId)
    );
    const [player, playerFetchError] = await safePromise(
      PlayerFetcher.getPlayerById(interaction.user.id)
    );
    if (characterFetchError || playerFetchError) {
      console.error("Error fetching character or player", characterFetchError, playerFetchError);
      void interaction.reply({
        content: "Ocorreu um erro ao tentar setar o seu personagem principal.",
        ephemeral: true,
      });
      return;
    }
    player.currentCharacterId = character.id;

    const [_updatedPlayer, updatePlayerError] = await safePromise(
      PocketBase.updateEntity<Player>({
        entityType: "players",
        entityData: player,
      })
    );

    if (updatePlayerError) {
      console.error("Error updating player", updatePlayerError);
      void interaction.reply({
        content: "Ocorreu um erro ao tentar setar o seu personagem principal.",
        ephemeral: true,
      });
      return;
    }

    void interaction.reply({
      content: `Seu personagem principal foi setado para ${character.name}.`,
      ephemeral: true,
    });
  }

  @Slash({
    description: "Mostra o personagem principal ou o personagem que você desejar.",
    name: "perfil",
  })
  async showProfile(
    @SlashOption(userChoice)
    user: User | null,
    @SlashOption(characterShowChoice)
    characterId: string | null,
    interaction: CommandInteraction | AutocompleteInteraction
  ): Promise<void> {
    // Conditions
    const hasOnlyUser = user && !characterId && !interaction.isAutocomplete();
    const hasOnlyCharacter = !user && characterId && !interaction.isAutocomplete();
    const hasNone = !user && !characterId && !interaction.isAutocomplete();
    const hasBoth = user && characterId && !interaction.isAutocomplete();
    if (hasBoth) {
      void interaction.reply({
        content:
          "Você não pode usar os dois argumentos ao mesmo tempo. Escolha usuário ou personagem.",
        ephemeral: true,
      });
      return;
    }
    if (hasOnlyUser || hasNone) {
      const targetUser = hasOnlyUser ? user : interaction.user;
      const [charProfile, charProfileError] = await safePromise(getCharProfile(targetUser));
      if (charProfileError) {
        console.error("Error fetching character profile", charProfileError);
        void interaction.reply({
          content: "Ocorreu um erro ao tentar mostrar o seu perfil",
          ephemeral: true,
        });
        return;
      }
      void interaction.reply(charProfile);
    }

    if (hasOnlyCharacter || hasBoth) {
      const [character, error] = await safePromise(CharacterFetcher.getCharacterById(characterId));
      if (error) {
        console.error("Error fetching character", error);
        void interaction.reply({
          content: "Ocorreu um erro ao tentar mostrar o seu perfil" + error?.message,
          ephemeral: true,
        });
        return;
      }

      const characterPost = new CharacterPost(character);
      const [messageOptions, messageOptionsError] = await safePromise(
        characterPost.createMessageOptions({
          to: "profile",
        })
      );
      if (messageOptionsError) {
        console.error("Error creating message options", messageOptionsError);
        void interaction.reply({
          content: "Ocorreu um erro ao tentar mostrar o seu perfil",
          ephemeral: true,
        });
        return;
      }
      void interaction.reply(messageOptions);
    }
  }
}
