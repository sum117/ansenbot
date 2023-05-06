import assert from "assert";
import type {
  AutocompleteInteraction,
  ButtonInteraction,
  ChatInputCommandInteraction,
  CommandInteraction,
  ModalSubmitInteraction,
  User,
} from "discord.js";
import {
  ButtonComponent,
  Discord,
  ModalComponent,
  SelectMenuComponent,
  Slash,
  SlashOption,
} from "discordx";

import characterEditForm from "../../lib/discord/UI/character/characterEditForm";
import {
  characterChoiceFromAll,
  characterChoiceFromUser,
  userChoice,
} from "../../lib/discord/UI/character/characterInteractionChoices";
import { CharacterEditor } from "../../lib/discord/UI/classes/CharacterEditor";
import CharacterPost from "../../lib/discord/UI/classes/CharacterPost";
import getCharProfile from "../../lib/discord/UI/helpers/getCharProfile";
import CharacterFetcher from "../../lib/pocketbase/CharacterFetcher";
import PlayerFetcher from "../../lib/pocketbase/PlayerFetcher";
import PocketBase from "../../lib/pocketbase/PocketBase";
import type { Player } from "../../types/Character";
import { BotError, PocketBaseError } from "../../utils/Errors";
import handleError from "../../utils/handleError";
import replyOrFollowUp from "../../utils/replyOrFollowUp";

@Discord()
export class CharacterEditorController {
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
    description: "Deleta um dos seus personagens.",
    name: "deletar-personagem",
  })
  async deleteCharacter(
    @SlashOption(characterChoiceFromUser)
    characterId: string,
    interaction: ChatInputCommandInteraction
  ): Promise<void> {
    try {
      await CharacterFetcher.deleteCharacter(interaction.user.id, characterId);
      void replyOrFollowUp(interaction, {
        content: "Personagem deletado com sucesso.",
      });
    } catch (error) {
      handleError(interaction, error);
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
    if (interaction.isAutocomplete()) {
      return;
    }

    try {
      await interaction.deferReply();
      const targetUser = user ?? interaction.user;

      if (characterId) {
        const character = await CharacterFetcher.getCharacterById(characterId);
        const characterPost = new CharacterPost(character);
        const messageOptions = await characterPost.createMessageOptions({
          to: "profile",
        });
        void interaction.editReply(messageOptions);
      } else {
        const charProfile = await getCharProfile(targetUser);
        void interaction.editReply(charProfile);
      }
    } catch (error) {
      handleError(interaction, error);
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
      const form = await characterEditForm(interaction);
      assert(
        form,
        new BotError(
          "Não consegui criar o formulário de edição. Por favor entre em contato com o suporte."
        )
      );
      void replyOrFollowUp(interaction, form);
    } catch (error) {
      handleError(interaction, error);
    }
  }

  @ButtonComponent({ id: /editChar:\w+:\w+/ })
  async handleEditCharacterButton(interaction: ButtonInteraction): Promise<void> {
    await new CharacterEditor(interaction).handleEditCharacterButton();
  }

  @SelectMenuComponent({ id: /editChar:\w+:\w+/ })
  async handleEditCharacterSelect(interaction: ButtonInteraction): Promise<void> {
    await new CharacterEditor(interaction).handleEditCharacterSelect();
  }

  @ModalComponent({ id: /editChar:\w+:\w+/ })
  async handleEditSubmit(interaction: ModalSubmitInteraction): Promise<void> {
    await new CharacterEditor(interaction).handleEditSubmit();
  }
}
