import type { AutocompleteInteraction, CommandInteraction, User } from "discord.js";
import { Discord, Slash, SlashOption } from "discordx";

import { characterSetChoice, characterShowChoice, userChoice } from "../../data/choices";
import CharacterPost from "../../lib/discord/Character/classes/CharacterPost";
import getCharProfile from "../../lib/discord/Character/helpers/getCharProfile";
import CharacterFetcher from "../../lib/pocketbase/CharacterFetcher";
import PlayerFetcher from "../../lib/pocketbase/PlayerFetcher";
import PocketBase from "../../lib/pocketbase/PocketBase";
import type { Player } from "../../types/Character";
import { PocketBaseError } from "../../utils/Errors";

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
    try {
      await interaction.deferReply({ ephemeral: true });
      const character = await CharacterFetcher.getCharacterById(characterId);
      const player = await PlayerFetcher.getPlayerById(interaction.user.id);
      player.currentCharacterId = character.id;
      await PocketBase.updateEntity<Player>({
        entityType: "players",
        entityData: player,
      });
      void interaction.editReply({
        content: `Seu personagem principal foi setado para ${character.name}.`,
      });
    } catch (error) {
      console.error(error);
      if (error instanceof PocketBaseError) {
        void interaction.editReply({
          content: error.message,
        });
        return;
      }
    }
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
    try {
      if (!interaction.isAutocomplete()) {
        await interaction.deferReply();
      }
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
        const charProfile = await getCharProfile(targetUser);
        void interaction.editReply(charProfile);
      }
      if (hasOnlyCharacter || hasBoth) {
        const character = await CharacterFetcher.getCharacterById(characterId);
        const characterPost = new CharacterPost(character);
        const messageOptions = await characterPost.createMessageOptions({
          to: "profile",
        });
        void interaction.editReply(messageOptions);
      }
    } catch (error) {
      console.error(error);
      if (error instanceof PocketBaseError) {
        if (!interaction.isAutocomplete()) {
          void interaction.editReply({
            content: error.message,
          });
        }
      }
    }
  }
}
