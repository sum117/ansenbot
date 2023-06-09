import { NotBot } from "@discordx/utilities";
import type {
  ButtonInteraction,
  CategoryChannel,
  CategoryChildChannel,
  Collection,
  GuildBasedChannel,
  Snowflake,
  TextChannel,
} from "discord.js";
import { ChannelType } from "discord.js";
import type { ArgsOf } from "discordx";
import { ButtonComponent, Discord, Guard, On, Once } from "discordx";

import config from "../../config.json" assert { type: "json" };
import { ValidRoleplayMessage } from "../guards/ValidRoleplayMessage";
import channelPlaceholderDismissButton from "../lib/discord/UI/channel/channelPlaceholderDismissButton";
import { channelPlaceHolderEmbed } from "../lib/discord/UI/channel/channelPlaceholderEmbed";
import { ChannelFetcher } from "../lib/pocketbase/ChannelFetcher";
import type { Channel } from "../types/Channel";
import deleteDiscordMessage from "../utils/deleteDiscordMessage";
import handleError from "../utils/handleError";
import logger from "../utils/loggerFactory";

@Discord()
export class OnRoleplayChannelActivity {
  private _presentationMessages: Map<Snowflake, Channel> = new Map();
  private LoopInterval = 2 * 60 * 60 * 1000;
  private MaxInactiveTime = 4 * 60 * 60 * 1000;

  @Once({ event: "ready" })
  main([client]: ArgsOf<"ready">): void {
    setInterval(async () => {
      try {
        const roleplayingCategories = client.guilds.cache
          .get(config.guilds.ansenfall)
          ?.channels.cache.filter(this.isRoleplayingCategory);
        if (!roleplayingCategories) {
          logger.error("Nenhuma categoria de Roleplay foi encontrada no servidor.");
          return;
        }
        const roleplayingChannels = this.getRoleplayingChannels(roleplayingCategories);
        await this.cachePresentationMessages(roleplayingChannels);
        await this.processRoleplayingChannels(roleplayingChannels);
      } catch (error) {
        logger.error(error);
      }
    }, this.LoopInterval);
  }

  @On({ event: "channelDelete" })
  async channelDelete([channel]: ArgsOf<"channelDelete">): Promise<void> {
    try {
      if (channel.type !== ChannelType.GuildText || !channel.parent) {
        return;
      }
      if (!this.isRoleplayingCategory(channel.parent)) {
        return;
      }
      this._presentationMessages.delete(channel.id);
      await ChannelFetcher.deleteChannelById(channel.id);
    } catch (error) {
      logger.error(error);
    }
  }

  @On({ event: "messageCreate" })
  @Guard(NotBot, ValidRoleplayMessage)
  resetTimer([message]: ArgsOf<"messageCreate">): void {
    try {
      const channel = message.channel;
      const presentationMessage = this._presentationMessages.get(channel.id);
      if (!presentationMessage) {
        return;
      }
      presentationMessage.updated = new Date().toISOString();
      this._presentationMessages.set(channel.id, presentationMessage);
    } catch (error) {
      handleError(message, error);
    }
  }

  @ButtonComponent({ id: "dismissPresentation" })
  async dismissPresentation(interaction: ButtonInteraction): Promise<void> {
    try {
      await interaction.deferReply();
      await interaction.message.delete().catch(() => null);
      await interaction.deleteReply().catch(() => null);
      const channel = interaction.channel;
      if (!channel) {
        return;
      }
      const presentationMessage = this._presentationMessages.get(channel.id);
      if (!presentationMessage) {
        return;
      }
      presentationMessage.updated = new Date().toISOString();
      this._presentationMessages.set(channel.id, presentationMessage);
    } catch (error) {
      handleError(interaction, error);
    }
  }

  private async processRoleplayingChannels(
    roleplayingChannels: GuildBasedChannel[]
  ): Promise<void> {
    for (const channel of roleplayingChannels) {
      if (channel.type !== ChannelType.GuildText) {
        continue;
      }
      const presentationMessage = this._presentationMessages.get(channel.id);
      if (!presentationMessage) {
        continue;
      }
      const activityDifference = Date.now() - new Date(presentationMessage.updated).getTime();
      if (activityDifference > this.MaxInactiveTime) {
        const presentationEmbed = channelPlaceHolderEmbed(presentationMessage);
        const message = await this.checkForPresentationMessages(channel);
        if (!message) {
          const newPresentationMessage = await channel.send({
            embeds: [presentationEmbed],
            components: [channelPlaceholderDismissButton],
          });
          const oldMessage = await channel.messages
            .fetch(presentationMessage.placeholderMessageId)
            .catch(() => null);
          if (oldMessage) {
            await deleteDiscordMessage(oldMessage, 0);
          }
          await ChannelFetcher.updateChannelById({
            ...presentationMessage,
            placeholderMessageId: newPresentationMessage.id,
          });
        }
      }
    }
  }

  private async checkForPresentationMessages(channel: TextChannel) {
    try {
      const messages = await channel.messages.fetch({
        limit: 6,
      });
      const databaseEntry = await ChannelFetcher.getChannelById(channel.id);
      const presentationMessage = messages.find(
        (message) => databaseEntry?.placeholderMessageId === message.id
      );

      if (!presentationMessage) {
        return null;
      }
      return presentationMessage;
    } catch (error) {
      logger.error("Incapaz de carregar as mensagens do canal de RP " + channel.id + ": " + error);
      return null;
    }
  }

  private getRoleplayingChannels(roleplayingCategories: Collection<string, CategoryChannel>) {
    return roleplayingCategories.reduce((acc: CategoryChildChannel[], category) => {
      const channels = category.children.cache.filter((channel): channel is TextChannel => {
        return channel.type === ChannelType.GuildText;
      });
      return [...acc, ...channels.values()];
    }, []);
  }

  private async cachePresentationMessages(roleplayingChannels: GuildBasedChannel[]) {
    for (const channel of roleplayingChannels) {
      if (channel.type !== ChannelType.GuildText) {
        continue;
      }
      let presentationMessageChannel = await ChannelFetcher.getChannelById(channel.id);
      if (!presentationMessageChannel) {
        const channelData = {
          name: channel.name,
          discordId: channel.id,
          description: "Atualize a descrição no banco de dados.",
          image: "",
          categoryId: channel.parentId!,
          hasSleep: false,
          hasSpirit: false,
          isSafe: false,
          placeholderMessageId: "",
        } as Channel;
        const embed = channelPlaceHolderEmbed(channelData);
        const presentationMessage = await channel.send({
          embeds: [embed],
          components: [channelPlaceholderDismissButton],
        });
        presentationMessageChannel = await ChannelFetcher.createChannelWithDiscordId({
          ...channelData,
          placeholderMessageId: presentationMessage.id,
        });
      }
      this._presentationMessages.set(channel.id, presentationMessageChannel);
    }
  }

  private isRoleplayingCategory(channel: GuildBasedChannel): channel is CategoryChannel {
    return channel.type === ChannelType.GuildCategory && channel.name.includes("RP");
  }
}
