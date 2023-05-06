import type { BaseMessageOptions, ButtonInteraction, Message } from "discord.js";
import { AttachmentBuilder, ChannelType, EmbedBuilder, userMention } from "discord.js";
import type { ArgsOf } from "discordx";
import { ButtonComponent, Discord, On } from "discordx";
import mustache from "mustache";

import { STATUS_SKILLS_RELATION } from "../data/constants";
import type { CharacterManager } from "../lib/discord/Character/classes/CharacterManager";
import getMaxStatus from "../lib/discord/Character/helpers/getMaxStatus";
import getRoleplayDataFromUserId from "../lib/discord/Character/helpers/getRoleplayDataFromUserId";
import isStatus from "../lib/discord/Character/helpers/isStatus";
import CharacterPost from "../lib/discord/UI/classes/CharacterPost";
import getCharEffects from "../lib/discord/UI/helpers/getCharEffects";
import getStatusBars from "../lib/discord/UI/helpers/getStatusBars";
import makeEquipmentStringArray from "../lib/discord/UI/helpers/makeEquipmentStringArray";
import { ChannelFetcher } from "../lib/pocketbase/ChannelFetcher";
import { EffectFetcher } from "../lib/pocketbase/EffectFetcher";
import PocketBase from "../lib/pocketbase/PocketBase";
import PostFetcher from "../lib/pocketbase/PostFetcher";
import type { Character, CharacterBody, Skills, Status } from "../types/Character";
import deleteDiscordMessage from "../utils/deleteDiscordMessage";
import equalityPercentage from "../utils/equalityPercentage";
import { BotError } from "../utils/Errors";
import getSafeEntries from "../utils/getSafeEntries";
import handleError from "../utils/handleError";

@Discord()
export class OnRoleplayMessage {
  @On({ event: "messageCreate" })
  async main([message]: ArgsOf<"messageCreate">): Promise<void> {
    try {
      if (!this.isValidRoleplayMessage(message)) {
        return;
      }

      const roleplayData = await getRoleplayDataFromUserId(message.author.id).catch(() => null);

      if (!roleplayData) {
        return;
      }

      const { currentCharacter, characterManager, view, status, skills } = roleplayData;

      await Promise.all([
        this.processExperienceGain(view, message, currentCharacter, characterManager),
        this.applyPassiveStatusLoss(
          view,
          message,
          currentCharacter,
          characterManager,
          status,
          skills
        ),
      ]);

      const characterPost = new CharacterPost(currentCharacter);
      const messageMentions = message.mentions.users;
      const sanitizedContent = message.content.replace(/<@!?\d+>/g, "").trim();

      const messageOptions = await characterPost.createMessageOptions({
        to: "message",
        embedContent: sanitizedContent,
        attachmentUrl: message.attachments.first()?.url,
      });

      if (messageMentions.size > 0) {
        messageOptions.content = messageMentions.map((user) => userMention(user.id)).join(" ");
      }
      deleteDiscordMessage(message, 1000);

      const similarMessage = await this.checkSimilarityFromPreviousMessages(message);
      if (similarMessage) {
        await this.handleSimilarMessage(similarMessage, message, messageOptions);
        return;
      }

      const postMessage = await message.channel.send(messageOptions);
      postMessage.author.id = message.author.id;
      postMessage.content = message.content;
      await PostFetcher.createPost(postMessage);
    } catch (error) {
      handleError(message, error);
    }
  }

  @ButtonComponent({ id: /character:status:open:\w+:\d+/ })
  async statusButton(interaction: ButtonInteraction): Promise<void> {
    try {
      const { currentCharacter, characterManager, status, skills } =
        await getRoleplayDataFromUserId(interaction.customId.split(":")[4]);
      const characterPost = new CharacterPost(currentCharacter);
      const equipment = await characterManager.getEquipment();

      this.addStatusBarsToEmbed(skills, status, characterPost);
      await Promise.all([
        this.addEffectsToEmbed(status, characterPost),
        this.addEquipmentToEmbed(equipment, characterPost),
      ]);

      const text = characterPost.embed.data.title;
      const iconURL = PocketBase.getImageUrl({
        record: currentCharacter,
        fileName: currentCharacter.image,
        thumb: true,
      });
      if (text) {
        characterPost.embed.setFooter({ text, iconURL });
      }

      characterPost.embed
        .setImage(null)
        .setThumbnail(null)
        .setTimestamp(null)
        .setAuthor(null)
        .setTitle(null)
        .setDescription(null);
      await interaction.reply({ embeds: [characterPost.embed] });
    } catch (error) {
      handleError(interaction, error);
    }
  }

  private async addEffectsToEmbed(status: Status, characterPost: CharacterPost): Promise<void> {
    if (status.effects.length) {
      const stateArray = await getCharEffects(status);
      characterPost.embed.addFields({
        name: "Efeitos",
        value: stateArray.join("\n"),
        inline: true,
      });
    }
  }

  private addStatusBarsToEmbed(skills: Skills, status: Status, characterPost: CharacterPost): void {
    const statusBars: string[] = getStatusBars(skills, status);
    characterPost.embed.addFields({
      name: "Status",
      value: statusBars.join("\n\n"),
      inline: true,
    });
  }

  private async addEquipmentToEmbed(equipment: CharacterBody, characterPost: CharacterPost) {
    const equipmentString = await makeEquipmentStringArray(equipment);

    characterPost.embed.addFields({
      name: "Equipamento",
      value: equipmentString.filter(Boolean).join("\n"),
      inline: true,
    });
  }

  private async processExperienceGain(
    view: Record<string, string | number>,
    message: Message,
    currentCharacter: Character,
    characterManager: CharacterManager
  ): Promise<void> {
    const latestPost = await PostFetcher.getLatestPostByCharacterId(currentCharacter.id).catch(
      () => null
    );

    let created: string;
    if (!latestPost) {
      created = new Date().toDateString();
    } else {
      created = latestPost.created;
    }
    const thirtyMinutes = new Date(created) > new Date(Date.now() - 30 * 60 * 1000);

    if (thirtyMinutes) {
      const amount = Math.floor(
        Math.random() * (message.content.length - message.content.length / 2 + 1) +
          message.content.length / 2
      );
      const didLevel = await characterManager.addXp(amount);

      if (didLevel > 0) {
        await message.channel.send(
          mustache.render(
            "💎 O personagem {{{character}}} de {{{author}}} subiu de nível para {{{level}}}, parabéns!",
            view
          )
        );
      }
    }
  }

  private async applyPassiveStatusLoss(
    view: Record<string, string | number>,
    message: Message,
    currentCharacter: Character,
    characterManager: CharacterManager,
    status: Status,
    skills: Skills
  ): Promise<void> {
    const statusLoss = Math.ceil(message.content.length / 1000);
    const channel = await ChannelFetcher.getChannelById(message.channel.id);
    const isSafe = channel?.isSafe ?? false;
    const hasSleep = channel?.hasSleep ?? false;
    const hasSpirit = channel?.hasSpirit ?? false;
    let statusWarning: { message: string; updatedStatus: Status } | null = null;
    if (!isSafe) {
      status.sleep -= statusLoss;
      status.hunger -= statusLoss;
      status.void -= statusLoss;
      status.stamina -= statusLoss;
      // if any of the status is below 25%, send warning message with what's low
      statusWarning = await this.getStatusWarning(skills, status, view);
    } else if (isSafe && hasSleep) {
      status.sleep += statusLoss;
      status.void += statusLoss;
      status.stamina += statusLoss;
      status.effects = [];
    }
    if (hasSpirit) {
      status.spirit += statusLoss;
    }

    await characterManager.setStatus(statusWarning?.updatedStatus ?? status);
    if (statusWarning) {
      await message.channel.send(statusWarning.message);
    }
  }

  private handleSimilarMessage(
    similarMessage: Message,
    message: Message,
    messageOptions: BaseMessageOptions
  ): void {
    const attachmentUrl = similarMessage.embeds[0]?.image?.url;
    if (attachmentUrl && !message.attachments.first()?.url) {
      const attachmentName = attachmentUrl?.split("/").pop();
      if (!attachmentName) {
        void similarMessage.edit(messageOptions);
        return;
      }
      const attachment = new AttachmentBuilder(attachmentUrl).setName(attachmentName);
      const embed = EmbedBuilder.from(similarMessage.embeds[0]);
      embed.setImage("attachment://" + attachment.name);
      messageOptions.files = [attachment];
      messageOptions.embeds = [embed];
    }

    void similarMessage.edit(messageOptions);
  }

  private async getStatusWarning(
    skills: Skills,
    status: Status,
    view: Record<string, string | number>
  ): Promise<{ message: string; updatedStatus: Status } | null> {
    const twentyFivePercent = 0.25;

    const effects = await EffectFetcher.getBaseEffects();

    const warningMessageArray: string[] = [];
    for (const [stat] of getSafeEntries(status)) {
      if (!isStatus(stat)) {
        continue;
      }
      const skill = STATUS_SKILLS_RELATION[stat];

      const effect = effects.find((effect) => effect.name === stat);
      if (!effect) {
        continue;
      }

      const maxStatus = getMaxStatus(skills);
      const percentage = Math.max(0, (status[stat] / maxStatus[skill]) * 100);
      const shouldWarn = percentage < twentyFivePercent && !status.effects.includes(effect.id);
      const isInDanger = percentage <= 0;
      if (shouldWarn) {
        warningMessageArray.push(mustache.render(effect.description, view));
      }
      if (isInDanger) {
        status.effects.push(effect.id);
      }
    }
    if (!warningMessageArray.length) {
      return null;
    }
    const warningMessage = warningMessageArray.join("\n");
    return { message: warningMessage, updatedStatus: status };
  }

  private async checkSimilarityFromPreviousMessages(message: Message) {
    if (!message.inGuild()) {
      throw new BotError("Message is not in guild");
    }
    const lastMessages = await message.channel.messages.fetch({ limit: 10 });
    return lastMessages.find((lastMessage) => {
      const prevCharacter = lastMessage.embeds[0]?.title;
      const prevContent = lastMessage.embeds[0]?.description;

      if (!prevContent || !prevCharacter) {
        return false;
      }
      const equality = equalityPercentage(prevContent, message.content);
      if (equality > 80) {
        return true;
      }
    });
  }

  private isValidRoleplayMessage(message: Message): boolean {
    if (!message.inGuild() || !message.channel.parent) {
      return false;
    }
    const isOffTopic =
      message.content.startsWith("//") ||
      message.content.startsWith("!") ||
      message.content.startsWith("((") ||
      message.content.startsWith("[[") ||
      message.content.startsWith("))");

    if (isOffTopic) {
      deleteDiscordMessage(message, 5_000 * 60);
    }

    return (
      message.channel.type === ChannelType.GuildText &&
      message.channel.parent.name.startsWith("RP") &&
      !message.author.bot &&
      !isOffTopic
    );
  }
}
