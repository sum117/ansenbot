import type { CommandInteraction, GuildTextBasedChannel } from "discord.js";
import {
  ApplicationCommandOptionType,
  AttachmentBuilder,
  channelMention,
  ChannelType,
  userMention,
} from "discord.js";
import type { SlashOptionOptions } from "discordx";
import { Discord, Slash, SlashOption } from "discordx";
import mustache from "mustache";

import CharacterFetcher from "../../lib/pocketbase/CharacterFetcher";
import PocketBase from "../../lib/pocketbase/PocketBase";

const characterFetcher = new CharacterFetcher();
const memories = characterFetcher.getAllMemories();

const memoryChoice: SlashOptionOptions<"memoria", "A memória que irá utilizar."> = {
  required: true,
  description: "A memória que irá utilizar.",
  name: "memoria",
  type: ApplicationCommandOptionType.String,
  autocomplete(interaction) {
    memories.then((memoryList) => {
      const choices = memoryList.map((memory) => ({
        name: memory.title,
        value: memory.title,
      }));
      interaction.respond(choices);
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

@Discord()
export class onCharacterMemory {
  @Slash({
    description: "Faz uma solicitação de roleplay como uma memória.",
    name: "memoria",
  })
  async main(
    @SlashOption(memoryChoice)
    memoryTitle: string,

    @SlashOption(channelChoice)
    channel: GuildTextBasedChannel,

    interaction: CommandInteraction
  ): Promise<void> {
    if (!interaction.inCachedGuild()) {
      void interaction.reply("Você não está em um servidor.");
      return;
    }

    const memoryData = await memories.then((memoryList) => {
      const chosenMemory = memoryList.find((memory) => memory.title === memoryTitle);
      if (!chosenMemory) {
        throw new Error("Memória não encontrada.");
      }
      return chosenMemory;
    });

    const view = {
      memory: userMention(interaction.user.id),
      channel: channelMention(channel.id),
    };
    const imageUrl = await PocketBase.getImageUrl({
      fileName: memoryData.icon,
      record: memoryData,
    });
    const attachment = new AttachmentBuilder(imageUrl).setName("image.png");
    void interaction.reply({
      content: mustache.render(memoryData.phrase, view),
      files: [attachment],
    });
  }
}
