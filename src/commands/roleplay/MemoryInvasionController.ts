import assert from "assert";
import type { ChatInputCommandInteraction, GuildTextBasedChannel } from "discord.js";
import { AttachmentBuilder, channelMention, userMention } from "discord.js";
import { Discord, Slash, SlashOption } from "discordx";
import mustache from "mustache";

import {
  channelChoice,
  memoryChoice,
} from "../../lib/discord/UI/character/characterInteractionChoices";
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
      assert(
        interaction.inCachedGuild(),
        new BotError("Você não pode utilizar os comandos do bot fora de Ansenfall.")
      );

      const memoryData = await MemoryFetcher.getAllMemories();
      const chosenMemory = memoryData.items.find((memory) => memory.title === memoryTitle);
      assert(chosenMemory, new BotError("Não foi possível encontrar a memória selecionada."));

      const view = {
        memory: userMention(interaction.user.id),
        channel: channelMention(channel.id),
      };
      const imageUrl = PocketBase.getImageUrl({
        fileName: chosenMemory.icon,
        record: chosenMemory,
      });
      const attachment = new AttachmentBuilder(imageUrl).setName("image.png");
      await interaction.reply({
        content: mustache.render(chosenMemory.phrase, view),
        files: [attachment],
      });
    } catch (error) {
      handleError(interaction, error);
    }
  }
}
