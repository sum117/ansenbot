import type { AutocompleteInteraction, CommandInteraction, User } from "discord.js";
import { ApplicationCommandOptionType } from "discord.js";
import type { SlashOptionOptions } from "discordx";
import { Discord, Slash, SlashOption } from "discordx";

import CharacterPost from "../../lib/discord/Character/classes/CharacterPost";
import {
  characterAutoCompleteFromAll,
  characterAutoCompleteFromPlayer,
} from "../../lib/discord/Character/helpers/characterAutoComplete";
import getCharProfile from "../../lib/discord/Character/helpers/getCharProfile";
import CharacterFetcher from "../../lib/pocketbase/CharacterFetcher";
import type { Player } from "../../types/Character";
import PlayerFetcher from "../../lib/pocketbase/PlayerFetcher";
import PocketBase from "../../lib/pocketbase/PocketBase";

const characterSetChoice: SlashOptionOptions<"personagem", "O personagem que você deseja setar."> =
  {
    required: true,
    description: "O personagem que você deseja setar.",
    name: "personagem",
    type: ApplicationCommandOptionType.String,
    autocomplete: (interaction) => characterAutoCompleteFromPlayer(interaction),
  };

const userChoice: SlashOptionOptions<
  "usuário",
  "Mostra o personagem atual do usuário selecionado."
> = {
  required: false,
  description: "Mostra o personagem atual do usuário selecionado.",
  name: "usuário",
  type: ApplicationCommandOptionType.User,
};

const characterShowChoice: SlashOptionOptions<"personagem", "Mostra qualquer personagem."> = {
  required: false,
  description: "Mostra qualquer personagem.",
  name: "personagem",
  autocomplete: characterAutoCompleteFromAll,
  type: ApplicationCommandOptionType.String,
};

function handleError(interaction: CommandInteraction | AutocompleteInteraction, error: any) {
  if (interaction.isAutocomplete()) {
    return;
  }
  void interaction.reply({
    content: "Ocorreu um erro ao tentar mostrar o seu perfil: " + error.message,
    ephemeral: true,
  });
  return null;
}

async function replyWithProfile(
  interaction: CommandInteraction | AutocompleteInteraction,
  user: User
) {
  const profile = await getCharProfile(user).catch((error) => handleError(interaction, error));

  if (!profile) {
    return;
  }
  if (interaction.isAutocomplete()) {
    return;
  }
  void interaction.reply(profile);
}

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
    const character = await CharacterFetcher.getCharacterById(characterId);
    const player = await PlayerFetcher.getPlayerById(interaction.user.id);
    player.currentCharacterId = character.id;

    const updatedPlayer = await PocketBase.updateEntity<Player>({
      entityType: "players",
      entityData: player,
    }).catch((error) => {
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
      await replyWithProfile(interaction, targetUser);
    }

    if (hasOnlyCharacter || hasBoth) {
      const character = await CharacterFetcher.getCharacterById(characterId);
      const characterPost = new CharacterPost(character);
      const messageOptions = await characterPost.createMessageOptions({
        to: "profile",
      });
      void interaction.reply(messageOptions);
    }
  }
}
