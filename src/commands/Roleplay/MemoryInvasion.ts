import type { CommandInteraction, GuildTextBasedChannel } from "discord.js";
import { AttachmentBuilder, channelMention, userMention } from "discord.js";
import { Discord, Slash, SlashOption } from "discordx";
import mustache from "mustache";

import { channelChoice, memoryChoice } from "../../data/choices";
import MemoryFetcher from "../../lib/pocketbase/MemoryFetcher";
import PocketBase from "../../lib/pocketbase/PocketBase";
import safePromise from "../../utils/safePromise";

@Discord()
export class MemoryInvasion {
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

    const [memoryData, memoryDataError] = await safePromise(MemoryFetcher.getAllMemories());
    if (memoryDataError) {
      console.error("Error while fetching memories: ", memoryDataError);
      void interaction.reply("Não foi possível carregar as memórias. Tente novamente.");
      return;
    }

    const chosenMemory = memoryData.items.find((memory) => memory.title === memoryTitle);
    if (!chosenMemory) {
      throw new Error("Memória não encontrada.");
    }

    const view = {
      memory: userMention(interaction.user.id),
      channel: channelMention(channel.id),
    };
    const [imageUrl, imageError] = await safePromise(
      PocketBase.getImageUrl({
        fileName: chosenMemory.icon,
        record: chosenMemory,
      })
    );
    if (imageError) {
      console.error("Error while fetching memory image: ", imageError);
      void interaction.reply({
        content: "Não foi possível carregar a imagem da memória.",
        files: [],
      });
      return;
    }

    const attachment = new AttachmentBuilder(imageUrl).setName("image.png");
    void interaction.reply({
      content: mustache.render(chosenMemory.phrase, view),
      files: [attachment],
    });
  }
}
