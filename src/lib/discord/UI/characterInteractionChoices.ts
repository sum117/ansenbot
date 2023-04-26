import { ApplicationCommandOptionType, ChannelType } from "discord.js";
import type { SlashOptionOptions } from "discordx";

import MemoryFetcher from "../../pocketbase/MemoryFetcher";
import {
  characterAutoCompleteFromAll,
  characterAutoCompleteFromPlayer,
} from "../Character/helpers/characterAutoComplete";

const characterChoiceFromUser: SlashOptionOptions<
  "personagem",
  "O personagem que você deseja setar."
> = {
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

const characterChoiceFromAll: SlashOptionOptions<"personagem", "O personagem a ser administrado."> =
  {
    required: false,
    description: "O personagem a ser administrado.",
    name: "personagem",
    autocomplete: characterAutoCompleteFromAll,
    type: ApplicationCommandOptionType.String,
  };

const memoryChoice: SlashOptionOptions<"memoria", "A memória que irá utilizar."> = {
  required: true,
  description: "A memória que irá utilizar.",
  name: "memoria",
  type: ApplicationCommandOptionType.String,
  autocomplete(interaction) {
    MemoryFetcher.getAllMemories().then((memoryList) => {
      const choices = memoryList.items.map((memory) => ({
        name: memory.title,
        value: memory.title,
      }));
      void interaction.respond(choices);
    });
  },
};

const channelChoice: SlashOptionOptions<"canal", "O canal onde a invasão irá ocorrer."> = {
  description: "O canal onde a invasão irá ocorrer.",
  name: "canal",
  type: ApplicationCommandOptionType.Channel,
  channelTypes: [ChannelType.GuildText],
  required: true,
};

export { channelChoice, characterChoiceFromAll, characterChoiceFromUser, memoryChoice, userChoice };
