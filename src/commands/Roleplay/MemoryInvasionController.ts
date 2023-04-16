import assert from "assert";
import type { ChatInputCommandInteraction, GuildTextBasedChannel } from "discord.js";
import { AttachmentBuilder, channelMention, userMention } from "discord.js";
import { Discord, Slash, SlashOption } from "discordx";
import mustache from "mustache";

import { channelChoice, memoryChoice } from "../../data/choices";
import MemoryFetcher from "../../lib/pocketbase/MemoryFetcher";
import PocketBase from "../../lib/pocketbase/PocketBase";
import { BotError } from "../../utils/Errors";
import handleError from "../../utils/handleError";

@Discord()
export class MemoryInvasionController {
  @Slash({
    description: "Faz uma solicitação de roleplay como uma memória.",
    name: "memoria",
  })
  async main(
    @SlashOption(memoryChoice)
    memoryTitle: string,
    @SlashOption(channelChoice)
    channel: GuildTextBasedChannel,
    interaction: ChatInputCommandInteraction
  ): Promise<void> {
    try {
      assert(interaction.inCachedGuild(), new BotError("interaction sent outside of guild"));

      const memoryData = await MemoryFetcher.getAllMemories();
      const chosenMemory = memoryData.items.find((memory) => memory.title === memoryTitle);
      assert(chosenMemory, new BotError("memory not found"));

      const view = {
        memory: userMention(interaction.user.id),
        channel: channelMention(channel.id),
      };
      const imageUrl = PocketBase.getImageUrl({
        fileName: chosenMemory.icon,
        record: chosenMemory,
      });
      const attachment = new AttachmentBuilder(imageUrl).setName("image.png");
      void interaction.reply({
        content: mustache.render(chosenMemory.phrase, view),
        files: [attachment],
      });
    } catch (error) {
      handleError(interaction, error);
    }
  }
}
