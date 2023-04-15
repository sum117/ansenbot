import type { CommandInteraction, GuildTextBasedChannel } from "discord.js";
import { AttachmentBuilder, channelMention, userMention } from "discord.js";
import { Discord, Slash, SlashOption } from "discordx";
import mustache from "mustache";

import { channelChoice, memoryChoice } from "../../data/choices";
import MemoryFetcher from "../../lib/pocketbase/MemoryFetcher";
import PocketBase from "../../lib/pocketbase/PocketBase";
import { BotError, PocketBaseError } from "../../utils/Errors";

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
    try {
      if (!interaction.inCachedGuild()) {
        throw new BotError("MemoryInvasion attempted to be executed outside of a guild.");
      }

      const memoryData = await MemoryFetcher.getAllMemories();
      const chosenMemory = memoryData.items.find((memory) => memory.title === memoryTitle);
      if (!chosenMemory) {
        throw new BotError("Memory not found in data array.");
      }

      const view = {
        memory: userMention(interaction.user.id),
        channel: channelMention(channel.id),
      };
      const imageUrl = await PocketBase.getImageUrl({
        fileName: chosenMemory.icon,
        record: chosenMemory,
      });
      const attachment = new AttachmentBuilder(imageUrl).setName("image.png");
      void interaction.reply({
        content: mustache.render(chosenMemory.phrase, view),
        files: [attachment],
      });
    } catch (error) {
      console.error(error);
      if (error instanceof PocketBaseError) {
        void interaction.reply(error.message);
        return;
      }
    }
  }
}
