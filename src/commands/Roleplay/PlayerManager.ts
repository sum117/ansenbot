import type {
  AutocompleteInteraction,
  ButtonInteraction,
  ChatInputCommandInteraction,
  CommandInteraction,
  ModalSubmitInteraction,
  User,
} from "discord.js";
import { TextInputStyle } from "discord.js";
import { ButtonComponent, Discord, ModalComponent, Slash, SlashOption } from "discordx";

import { characterChoiceFromAll, characterChoiceFromUser, userChoice } from "../../data/choices";
import editCharacterForm from "../../data/forms/editCharacterForm";
import { CharacterEditor } from "../../lib/discord/Character/classes/CharacterEditor";
import CharacterPost from "../../lib/discord/Character/classes/CharacterPost";
import getCharProfile from "../../lib/discord/Character/helpers/getCharProfile";
import CharacterFetcher from "../../lib/pocketbase/CharacterFetcher";
import PlayerFetcher from "../../lib/pocketbase/PlayerFetcher";
import PocketBase from "../../lib/pocketbase/PocketBase";
import type { Player } from "../../types/Character";
import { PocketBaseError } from "../../utils/Errors";
import handleError from "../../utils/handleError";
import replyOrFollowUp from "../../utils/replyOrFollowUp";

@Discord()
export class PlayerManager {
  @Slash({
    description: "Seta o seu personagem principal.",
    name: "setar-personagem",
  })
  async setMainCharacter(
    @SlashOption(characterChoiceFromUser)
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
    @SlashOption(characterChoiceFromAll)
    characterId: string | null,
    interaction: ChatInputCommandInteraction | AutocompleteInteraction
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
      if (!interaction.isAutocomplete()) {
        handleError(interaction, error);
      }
    }
  }

  @Slash({
    description: "Edita um personagem.",
    name: "editar-personagem",
  })
  async editCharacterPrompt(
    @SlashOption(characterChoiceFromUser)
    _characterId: string,
    interaction: ChatInputCommandInteraction
  ): Promise<void> {
    try {
      await interaction.deferReply({
        ephemeral: false,
      });
      const form = await editCharacterForm(interaction);
      void replyOrFollowUp(interaction, form);
    } catch (error) {
      handleError(interaction, error);
    }
  }

  @ButtonComponent({ id: /editChar:\w+:\w+/ })
  async handleEditCharacterButton(interaction: ButtonInteraction): Promise<void> {
    await new CharacterEditor(interaction).handleEditCharacterButton();
  }

  @ModalComponent({ id: /editChar:\w+:\w+/ })
  async handleEditSubmit(interaction: ModalSubmitInteraction): Promise<void> {
    await new CharacterEditor(interaction).handleEditSubmit();
  }
}
