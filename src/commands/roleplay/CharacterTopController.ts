import type { ButtonInteraction, ChatInputCommandInteraction } from "discord.js";
import { ButtonBuilder, ButtonStyle, codeBlock } from "discord.js";
import { ButtonComponent, Discord, Slash } from "discordx";
import mustache from "mustache";
import table from "text-table";

import MultiForm from "../../lib/discord/UI/classes/MultiForm";
import CharacterFetcher from "../../lib/pocketbase/CharacterFetcher";
import PocketBase from "../../lib/pocketbase/PocketBase";
import handleError from "../../utils/handleError";

export const CHARACTER_TOP_ID_REGEX =
  /character:top:(?<type>level|posts):(?<page>\d+):(?<direction>next|previous)/;

@Discord()
export class CharacterTopController {
  @Slash({ name: "character-top", description: "Mostra o top de personagens do servidor." })
  async main(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      await interaction.deferReply();
      const embed = await this.makeTopEmbed(1);
      await interaction.editReply(embed);
    } catch (error) {
      handleError(interaction, error);
    }
  }

  @ButtonComponent({
    id: CHARACTER_TOP_ID_REGEX,
  })
  async handleButton(interaction: ButtonInteraction): Promise<void> {
    try {
      await interaction.deferUpdate();
      const { page } = this.getCredentials(interaction);
      const embed = await this.makeTopEmbed(page);
      await interaction.editReply(embed);
    } catch (error) {
      handleError(interaction, error);
    }
  }

  private getCredentials(interaction: ButtonInteraction) {
    const groups = interaction.customId.match(CHARACTER_TOP_ID_REGEX)?.groups;
    if (!groups) {
      throw new Error("O Id da interação está inválido.");
    }
    return {
      page: parseInt(groups.page),
      type: groups.type as "level" | "posts",
      direction: groups.direction as "next" | "previous",
    };
  }

  private async makeTopEmbed(page: number, type: "level" | "posts" = "level") {
    const characterTopData = await CharacterFetcher.getCharacterTop({
      page,
      type,
    });

    const isFirstPage = page === 1;
    const previousPage = Math.max(1, page - 1);
    const nextPage = Math.min(characterTopData.totalPages, page + 1);

    const topCharacter = await CharacterFetcher.getCharacterById(characterTopData.items[0].id);
    const topOneString = mustache.render(
      "👑 ({{{level}}}) **{{{name}}}** é o personagem mais forte do servidor!\n",
      {
        name: topCharacter.name,
        level: topCharacter.level,
      }
    );
    const topString: Array<Array<string | number>> = [];

    characterTopData.items.slice(isFirstPage ? 1 : 0).forEach((character, i) => {
      const index = characterTopData.perPage * (page - 1) + i + (isFirstPage ? 2 : 1);
      const chunk = [
        index,
        `(${character.level})`,
        character.name.trim(),
        character.posts.length + " 📕",
      ];

      topString.push(chunk);
    });
    const topTable = table(topString, { align: ["l", "l", "l", "r"], hsep: "ㅤㅤ" });
    const embed = new MultiForm({
      controller: true,
      controlFields: [
        new ButtonBuilder()
          .setCustomId(`character:top:level:${previousPage}:previous`)
          .setLabel("Página anterior")
          .setStyle(ButtonStyle.Primary)
          .setEmoji("⬅️"),
        new ButtonBuilder()
          .setCustomId(`character:top:level:${nextPage}:next`)
          .setLabel("Próxima página")
          .setStyle(ButtonStyle.Primary)
          .setEmoji("➡️"),
      ],
      title: "Top de personagens",

      description: isFirstPage ? topOneString + codeBlock(topTable) : codeBlock(topTable),
      fields: [],
      embedColor: topCharacter.expand.race[0].color,
    });
    embed.setEmbedThumbnail(
      PocketBase.getImageUrl({
        fileName: topCharacter.image,
        record: topCharacter,
      })
    );
    return embed;
  }
}
