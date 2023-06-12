import type { Attachment, CategoryChannel, ChatInputCommandInteraction } from "discord.js";
import { ApplicationCommandOptionType, channelMention, ChannelType } from "discord.js";
import type { SlashOptionOptions } from "discordx";
import { Discord, Slash, SlashGroup, SlashOption } from "discordx";
import kebabCase from "lodash.kebabcase";
import mustache from "mustache";

import {
  REIGN_CHANNEL_CREATION_BASE_COST,
  REIGN_CHANNEL_MAX_AMOUNT,
  REIGN_CREATION_COST,
} from "../../data/constants";
import type { CharacterManager } from "../../lib/discord/Character/classes/CharacterManager";
import getRoleplayDataFromUserId from "../../lib/discord/Character/helpers/getRoleplayDataFromUserId";
import { characterChoiceFromAll } from "../../lib/discord/UI/character/characterInteractionChoices";
import { ChannelFetcher } from "../../lib/pocketbase/ChannelFetcher";
import CharacterFetcher from "../../lib/pocketbase/CharacterFetcher";
import PocketBase from "../../lib/pocketbase/PocketBase";
import ReignFetcher from "../../lib/pocketbase/ReignFetcher";
import type { Reign } from "../../types/Reign";
import { BotError } from "../../utils/Errors";
import handleError from "../../utils/handleError";

export interface ReignChannelCreationData {
  characterManager: CharacterManager;
  reign: Reign;
  category: CategoryChannel;
  name: string;
  topic?: string;
  image?: Attachment["proxyURL"];
}
const reignNameSlashOption: SlashOptionOptions<Lowercase<string>, string> = {
  name: "nome",
  description: "Nome do reino",
  type: ApplicationCommandOptionType.String,
};

const reignImageSlashOption: SlashOptionOptions<Lowercase<string>, string> = {
  name: "imagem_do_reino",
  description: "Imagem do reino",
  type: ApplicationCommandOptionType.Attachment,
};

const channelNameSlashOption: SlashOptionOptions<Lowercase<string>, string> = {
  name: "nome",
  description: "Nome do canal",
  type: ApplicationCommandOptionType.String,
};

const channelDescriptionSlashOption: SlashOptionOptions<Lowercase<string>, string> = {
  name: "descricao",
  description: "Descrição do canal",
  type: ApplicationCommandOptionType.String,
};

const channelImageSlashOption: SlashOptionOptions<Lowercase<string>, string> = {
  name: "imagem_do_canal",
  description: "Imagem do canal",
  type: ApplicationCommandOptionType.Attachment,
};

@SlashGroup({ description: "Comandos de Reinos", name: "reino" })
@SlashGroup("reino")
@Discord()
export class ReignController {
  @Slash({
    name: "criar",
    description: "Cria um novo reino",
  })
  async create(
    @SlashOption(reignNameSlashOption)
    name: string,
    @SlashOption(reignImageSlashOption)
    image: Attachment,
    interaction: ChatInputCommandInteraction
  ): Promise<void> {
    try {
      await interaction.deferReply();

      const { characterManager } = await getRoleplayDataFromUserId(interaction.user.id);
      if (characterManager.character.expand.status.spirit < REIGN_CREATION_COST) {
        await interaction.editReply(
          "❌ Você não possui Lascas Espirituais o suficiente para criar um reino!"
        );
        return;
      }

      const existingReign = await ReignFetcher.getReignByOwnerId(characterManager.character.id);
      if (existingReign) {
        await interaction.editReply("❌ Você já possui um reino com esse personagem!");
        return;
      }

      const category = await interaction.guild?.channels.create({
        name: "RP | " + name,
        type: ChannelType.GuildCategory,
      });
      if (!category) {
        await interaction.editReply("❌ Erro ao criar categoria!");
        return;
      }

      const newReign = await ReignFetcher.createReign({
        categoryId: category.id,
        channels: [],
        characters: [characterManager.character.id],
        owner: characterManager.character.id,
        image: image.proxyURL,
        name,
      });

      const { channel } = await this.createReignChannel({
        characterManager,
        reign: newReign,
        category,
        name: "Sede do Reino" + name,
      });

      const feedback = mustache.render(
        "✅ {{{character}}} criou o reino {{{reign}}}. Acesse o seu primeiro canal aqui: {{{channel}}}",
        {
          character: characterManager.character.name,
          reign: newReign.name,
          channel: channelMention(channel.id),
        }
      );

      await characterManager.setStatus({
        ...characterManager.character.expand.status,
        spirit: characterManager.character.expand.status.spirit - REIGN_CREATION_COST,
      });

      await interaction.editReply(feedback);
    } catch (error) {
      handleError(interaction, error);
    }
  }

  @Slash({
    name: "setar-membro",
    description: "Seta um membro para o reino",
  })
  async setMember(
    @SlashOption(characterChoiceFromAll) characterId: string,
    interaction: ChatInputCommandInteraction
  ): Promise<void> {
    try {
      await interaction.deferReply();
      const { character: agentCharacter } = await getRoleplayDataFromUserId(interaction.user.id);
      const targetCharacter = await CharacterFetcher.getCharacterById(characterId);

      const reign = await ReignFetcher.getReignByOwnerId(agentCharacter.id);
      if (!reign) {
        await interaction.editReply("❌ Você não possui um reino!");
        return;
      }

      const targetReign = await ReignFetcher.getReignByCharacterId(targetCharacter.id);
      if (targetReign && targetReign.id !== reign.id) {
        await interaction.editReply("❌ O personagem alvo já possui um reino!");
        return;
      }

      if (reign.characters.includes(targetCharacter.id)) {
        await ReignFetcher.updateReign({
          ...reign,
          characters: reign.characters.filter((id) => id !== targetCharacter.id),
        });
        await interaction.editReply(
          `✅ ${targetCharacter.name} foi removido do reino ${reign.name}!`
        );
        return;
      }

      await ReignFetcher.updateReign({
        ...reign,
        characters: [...reign.characters, targetCharacter.id],
      });
      await interaction.editReply(`✅ ${targetCharacter.name} foi adicionado ao reino!`);
    } catch (error) {
      handleError(interaction, error);
    }
  }

  @Slash({
    name: "criar-canal",
    description: "Cria um novo canal no seu reino",
  })
  async createChannel(
    @SlashOption(channelNameSlashOption) name: string,
    @SlashOption(channelImageSlashOption) image: Attachment,
    @SlashOption(channelDescriptionSlashOption) topic: string,
    interaction: ChatInputCommandInteraction
  ): Promise<void> {
    try {
      await interaction.deferReply();
      const { characterManager } = await getRoleplayDataFromUserId(interaction.user.id);

      const reign = await ReignFetcher.getReignByOwnerId(characterManager.character.id);
      if (!reign) {
        await interaction.editReply("❌ Você não possui um reino!");
        return;
      }

      const category = await interaction.guild?.channels.fetch(reign.categoryId);
      if (!category || category.type !== ChannelType.GuildCategory) {
        await interaction.editReply("❌ Erro ao encontrar a categoria do reino!");
        return;
      }

      const length = category.children.holds.length;
      if (length >= REIGN_CHANNEL_MAX_AMOUNT) {
        await interaction.editReply("❌ Você já possui o número máximo de canais!");
        return;
      }

      const cost = length * REIGN_CHANNEL_CREATION_BASE_COST;
      if (characterManager.character.expand.status.spirit < cost) {
        await interaction.editReply(
          `❌ Você não possui Lascas Espirituais o suficiente para criar um novo canal! Custo: ${cost}`
        );
        return;
      }

      const { channel } = await this.createReignChannel({
        characterManager,
        reign,
        topic,
        category,
        name,
        image: image.proxyURL,
      });

      await characterManager.setStatus({
        ...characterManager.character.expand.status,
        spirit: characterManager.character.expand.status.spirit - cost,
      });

      const feedback = mustache.render(
        "✅ {{{character}}} criou o canal {{{channel}}} no reino {{{reign}}}, gastando {{{cost}}} de Lascas Espirituais.",
        {
          character: characterManager.character.name,
          reign: reign.name,
          channel: channelMention(channel.id),
          cost,
        }
      );

      await interaction.editReply(feedback);
    } catch (error) {
      handleError(interaction, error);
    }
  }

  private async createReignChannel({
    characterManager,
    reign,
    category,
    name,
    image,
    topic = "Canal do Reino {{{reign}}}, onde o(a) Rei/Rainha {{{character}}} reside.",
  }: ReignChannelCreationData) {
    const channel = await category.children.create({
      name: `${kebabCase(name)}`,
      type: ChannelType.GuildText,
      position: 0,
      topic: mustache.render(topic, {
        reign: reign.name,
        character: characterManager.character.name,
      }),
    });
    if (!channel) {
      throw new BotError("❌ Erro ao criar canal!");
    }

    const dbChannel = await ChannelFetcher.createChannelWithFormData({
      categoryId: category.id,
      description: channel.topic ?? "Atualize a descrição no banco de dados.",
      discordId: channel.id,
      hasSleep: true,
      hasSpirit: false,
      name: channel.name,
      isSafe: true,
      placeholderMessageId: "",
      image: image ?? PocketBase.getImageUrl({ record: reign, fileName: reign.image }),
    });
    await ReignFetcher.updateReign({ ...reign, channels: [dbChannel.id] });
    return { channel, dbChannel };
  }
}
