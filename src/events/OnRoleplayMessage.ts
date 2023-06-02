import type { BaseMessageOptions, ButtonInteraction, Message } from "discord.js";
import { AttachmentBuilder, ChannelType, EmbedBuilder, userMention } from "discord.js";
import type { ArgsOf } from "discordx";
import { ButtonComponent, Discord, On } from "discordx";
import random from "lodash.random";
import mustache from "mustache";

import {
  ENDURANCE_GAIN_PER_SAFE_TICK_MULTIPLIER,
  MATERIAL_GAIN_PER_TICK_RANGE,
  SPIRIT_GAIN_PER_TICK,
  STATUS_SKILLS_RELATION,
} from "../data/constants";
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
import { craftingMaterialsSchema } from "../schemas/characterSchema";
import type { Character, CharacterBody, Skills, Status } from "../types/Character";
import deleteDiscordMessage from "../utils/deleteDiscordMessage";
import equalityPercentage from "../utils/equalityPercentage";
import { BotError } from "../utils/Errors";
import getSafeEntries from "../utils/getSafeEntries";
import getSafeKeys from "../utils/getSafeKeys";
import handleError from "../utils/handleError";

@Discord()
export class OnRoleplayMessage {
  @On({ event: "messageCreate" })
  async main([message]: ArgsOf<"messageCreate">): Promise<void> {
    try {
      if (!this.isValidRoleplayMessage(message)) {
        return;
      }

      const isOffTopic =
        message.content.startsWith("//") ||
        message.content.startsWith("!") ||
        message.content.startsWith("((") ||
        message.content.startsWith("[[") ||
        message.content.startsWith("))");

      if (isOffTopic) {
        void deleteDiscordMessage(message, 60_000);
        return;
      }

      const roleplayData = await getRoleplayDataFromUserId(message.author.id).catch(() => {
        return null;
      });

      if (!roleplayData) {
        return;
      }

      const { character: currentCharacter, characterManager, view, status, skills } = roleplayData;

      const characterPost = new CharacterPost(currentCharacter);
      const messageMentions = message.mentions.users;
      const sanitizedContent = message.content.replace(/<@!?\d+>/g, "").trim();

      const messageOptions = characterPost.createMessageOptions({
        to: "message",
        embedContent: sanitizedContent,
        attachmentUrl: message.attachments.first()?.url,
      });

      if (messageMentions.size > 0) {
        messageOptions.content = messageMentions.map((user) => userMention(user.id)).join(" ");
      }
      const similarMessage = await this.checkSimilarityFromPreviousMessages(
        message,
        currentCharacter
      );
      if (similarMessage) {
        await this.handleSimilarMessage(similarMessage, message, messageOptions);
        void deleteDiscordMessage(message, 1000);
        return;
      }

      void deleteDiscordMessage(message, 1000);
      await Promise.all([
        this.processExperienceGain(view, message, characterManager),
        this.applyPassiveStatusGainLoss(view, message, characterManager, status, skills),
      ]);
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
      const {
        character: currentCharacter,
        characterManager,
        status,
        skills,
      } = await getRoleplayDataFromUserId(interaction.customId.split(":")[4]);
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
    characterPost.embed.addFields({ name: "Status", value: statusBars.join("\n"), inline: true });
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
    characterManager: CharacterManager
  ): Promise<void> {
    const latestPost = await PostFetcher.getLatestPostByCharacterId(
      characterManager.character.id
    ).catch(() => null);

    let created: string;
    if (!latestPost) {
      created = new Date().toDateString();
    } else {
      created = latestPost.created;
    }
    const thirtyMinutes = new Date(Date.now() - 30 * 60 * 1000) > new Date(created);

    if (thirtyMinutes) {
      const amount = Math.floor(
        Math.random() * (message.content.length - message.content.length / 2 + 1) +
          message.content.length / 2
      );
      const newCharLevel = await characterManager.addXp(amount);
      view.level = newCharLevel;
      if (newCharLevel > 0) {
        await message.channel.send(
          mustache.render(
            "💎 O personagem {{{character}}} de {{{author}}} subiu de nível para {{{level}}}, parabéns!",
            view
          )
        );
      }
    }
  }

  private async applyPassiveStatusGainLoss(
    view: Record<string, string | number>,
    message: Message,
    characterManager: CharacterManager,
    status: Status,
    skills: Skills
  ): Promise<void> {
    const statusTick = Math.ceil(message.content.length / 1000);
    const channel = await ChannelFetcher.getChannelById(message.channel.id);
    const isSafe = channel?.isSafe ?? false;
    const hasSleep = channel?.hasSleep ?? false;
    const hasSpirit = channel?.hasSpirit ?? false;
    let statusWarning: { message: string; updatedStatus: Status } | null = null;
    if (!isSafe) {
      status.sleep -= statusTick;
      status.hunger -= statusTick;
      status.void -= statusTick;
      status.stamina -= statusTick;
      // if any of the status is below 25%, send warning message with what's low
      statusWarning = await this.getStatusWarning(skills, status, view);
    } else if (isSafe && hasSleep) {
      status.sleep += statusTick * ENDURANCE_GAIN_PER_SAFE_TICK_MULTIPLIER;
      status.void += statusTick * ENDURANCE_GAIN_PER_SAFE_TICK_MULTIPLIER;
      status.stamina += statusTick * ENDURANCE_GAIN_PER_SAFE_TICK_MULTIPLIER;
      status.effects = [];
    }
    if (hasSpirit) {
      const resources = getSafeKeys(craftingMaterialsSchema.keyof().enum);
      const randomResource = resources[random(0, resources.length - 1)];
      const randomAmount = random(...MATERIAL_GAIN_PER_TICK_RANGE);
      status[randomResource] += randomAmount;
      status.spirit += statusTick * SPIRIT_GAIN_PER_TICK;
    }

    await characterManager.setStatus(statusWarning?.updatedStatus ?? status);
    if (statusWarning) {
      await message.channel.send(statusWarning.message);
    }
  }

  private async handleSimilarMessage(
    similarMessage: Message,
    message: Message,
    messageOptions: BaseMessageOptions
  ): Promise<void> {
    const attachmentUrl = similarMessage.embeds[0]?.image?.url;
    if (attachmentUrl && !message.attachments.first()?.url) {
      const attachmentName = attachmentUrl?.split("/").pop();
      if (!attachmentName) {
        await similarMessage.edit(messageOptions);
        return;
      }
      const attachment = new AttachmentBuilder(attachmentUrl).setName(attachmentName);
      const embed = EmbedBuilder.from(similarMessage.embeds[0]);
      embed.setImage("attachment://" + attachment.name);
      embed.setDescription(message.content);
      messageOptions.files = [attachment];
      messageOptions.embeds = [embed];
    }

    await similarMessage.edit(messageOptions);
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

  private async checkSimilarityFromPreviousMessages(message: Message, character: Character) {
    const lastPostId = character.posts.at(-1);
    if (!lastPostId) {
      return;
    }
    if (!message.inGuild()) {
      throw new BotError("A mensagem não está dentro de Ansenfall.");
    }
    const lastPost = await PostFetcher.getPostById(lastPostId);
    const equality = equalityPercentage(lastPost.content, message.content);
    if (equality > 80) {
      return message.channel.messages.fetch(lastPost.messageId).catch((error) => {
        console.error(error);
      });
    }
  }

  private isValidRoleplayMessage(message: Message): boolean {
    if (!message.inGuild() || !message.channel.parent) {
      return false;
    }

    return (
      message.channel.type === ChannelType.GuildText &&
      message.channel.parent.name.startsWith("RP") &&
      !message.author.bot
    );
  }
}
