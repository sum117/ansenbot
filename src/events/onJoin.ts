import { ChannelType } from "discord.js";
import type { ArgsOf } from "discordx";
import { Discord, On } from "discordx";
import mustache from "mustache";

import config from "../../config.json" assert { type: "json" };
import getRoleplayDataFromUserId from "../lib/discord/Character/helpers/getRoleplayDataFromUserId";
import deleteDiscordMessage from "../utils/deleteDiscordMessage";

@Discord()
export class OnJoin {
  private alreadyWelcomed = new Set<string>();

  @On()
  async guildMemberAdd([member]: ArgsOf<"guildMemberAdd">): Promise<void> {
    try {
      const generalChat = await member.guild.channels.fetch(config.channels.general);
      if (!generalChat || generalChat.type !== ChannelType.GuildText) {
        console.error("General Channel not found");
        return;
      }

      await generalChat.send(
        mustache.render(
          "🥳 {{{member}}} entrou no servidor! Seja bem-vindo! Espero que se divirta conosco! Prepare-se para o abraço da comunidade!",
          {
            member: member.toString(),
          }
        )
      );

      const WELCOME_TIMEOUT = 5 * 60 * 1000;
      const WELCOME_REGEX = /bem[- ]?vindo/i;
      const WELCOME_REWARD = 100;
      const WELCOME_RESPONSE_DELAY = 5_000;

      const welcomeCollector = generalChat.createMessageCollector({
        filter: (message) =>
          !this.alreadyWelcomed.has(message.author.id) &&
          WELCOME_REGEX.test(message.content) &&
          message.mentions.has(member.id),
        time: WELCOME_TIMEOUT,
      });

      welcomeCollector.on("collect", async (message) => {
        if (message.author.id === member.id || this.alreadyWelcomed.has(message.author.id)) {
          return;
        }

        this.alreadyWelcomed.add(message.author.id);

        const data = await getRoleplayDataFromUserId(message.author.id).catch(() => null);
        if (!data) {
          return;
        }

        const status = data.characterManager.character.expand.status;
        await data.characterManager.setStatus({
          ...status,
          spirit: status.spirit + WELCOME_REWARD,
        });

        const welcomeResponse = await message.reply(
          mustache.render(
            "{{{emoji}}} {{{welcomer}}} recebeu **{{{reward}}}** de Lascas Espirituais no(a) {{{character}}} por dar as boas-vindas à {{{member}}}!",
            {
              member: member.toString(),
              reward: WELCOME_REWARD,
              welcomer: message.author.toString(),
              emoji: "<:spe:1112959211576508437>",
              character: data.character.name,
            }
          )
        );
        await deleteDiscordMessage(welcomeResponse, WELCOME_RESPONSE_DELAY);
      });

      welcomeCollector.on("end", () => {
        this.alreadyWelcomed.clear();
      });
    } catch (error) {
      console.error(error);
    }
  }

  @On()
  async guildMemberUpdate([oldMember, newMember]: ArgsOf<"guildMemberUpdate">): Promise<void> {
    try {
      const newRoles = newMember.roles.cache;
      const oldRoles = oldMember.roles.cache;
      if (!newRoles.has(config.roles.student) || oldRoles.has(config.roles.student)) {
        return;
      }

      const channel = await newMember.guild.channels.fetch(config.channels.mentor);
      if (!channel || channel.type !== ChannelType.GuildText) {
        console.error("Mentor Channel not found");
        return;
      }

      const randomStaff = channel.members
        .filter(
          (member) =>
            member.roles.cache.has(config.roles.admin) || member.roles.cache.has(config.roles.mod)
        )
        .random();
      if (!randomStaff) {
        console.error("No staff found for mentor channel");
        return;
      }

      await channel.send(
        mustache.render(
          "🥳 {{{member}}} pediu para participar da mentoria e foi adicionado ao grupo de estudantes de {{{staff}}}. Não se preocupe, o seu mentor entrará em contato com você em breve!",
          {
            member: newMember.toString(),
            staff: randomStaff.toString(),
          }
        )
      );
    } catch (error) {
      console.error(error);
    }
  }
}
