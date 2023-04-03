import type { StringSelectMenuInteraction } from "discord.js";
import { userMention } from "discord.js";
import type { ArgsOf } from "discordx";
import { Discord, On, SelectMenuComponent } from "discordx";
import mustache from "mustache";

import { JOIN_FORM_VALUES } from "../../data/constants";
import { onJoinForm } from "../../data/forms";
import MultiForm from "../../lib/discord/Prompt/MultiForm";
import type { Properties } from "../../types/Utils";
import deleteDiscordMessage from "../../utils/deleteDiscordMessage";

@Discord()
export class UserManagement {
  private interaction: StringSelectMenuInteraction | null = null;

  @On({
    event: "messageCreate",
  })
  // TODO: Change to guildMemberAdd after testing
  async messageCreate([message]: ArgsOf<"messageCreate">): Promise<void> {
    if (
      message.author.bot ||
      !message.guild ||
      !message.content.startsWith("test") ||
      message.channelId !== "1092243613938892931"
    ) {
      return;
    }
    const onJoinChannel = message.guild.channels.cache.find((channel) => {
      return channel.name === "bem-vindo";
    });

    if (!onJoinChannel?.isTextBased()) {
      return;
    }

    onJoinForm.description = mustache.render(onJoinForm.description, {
      server: message.guild.name,
      user: userMention(message.author.id),
    });

    const formMessage = await new MultiForm(onJoinForm)
      .setMessageContent(userMention(message.author.id))
      .sendPrompt(onJoinChannel);

    deleteDiscordMessage(formMessage, 60_000);
  }

  @SelectMenuComponent({
    id: new RegExp("joinForm"),
  })
  async onChoose(interaction: StringSelectMenuInteraction): Promise<void> {
    this.interaction = interaction;
    await interaction.deferReply({ ephemeral: true });
    switch (interaction.customId) {
      case "joinForm:mentor": {
        void this.handleMentorSelection();
      }
    }
  }

  private async handleMentorSelection(): Promise<void> {
    if (!this.interaction) {
      return;
    }
    if (this.interaction.replied) {
      void this.interaction.followUp({
        content: "Você já respondeu a essa pergunta!",
        ephemeral: true,
      });
      return;
    }

    const values = this.interaction.values as Properties<typeof JOIN_FORM_VALUES>[];

    if (values[0] === JOIN_FORM_VALUES.wantsMentor) {
      if (!this.interaction.guild) {
        return;
      }

      const mentorChannel = this.interaction.guild.channels.cache.find(
        (channel) => channel.name === "mentoria"
      );

      if (!mentorChannel?.isTextBased()) {
        return;
      }

      const possibleMentors = (await this.interaction.guild.members.fetch()).filter((member) => {
        return member.roles.cache.find(
          (role) => role.name === "Administrador" || role.name === "Moderador"
        );
      });

      const mentor = possibleMentors.random(1).at(0);
      if (!mentor) {
        return;
      }

      const view = {
        mentor: userMention(mentor.id),
        user: userMention(this.interaction.user.id),
      };

      void mentorChannel.send({
        content: mustache.render(
          "Olá {{{mentor}}}. {{{user}}} pediu por um mentor no registro e você foi designado para o cargo. Por favor, entre em contato com ele o mais rápido possível.",
          view
        ),
      });

      void this.interaction.editReply({
        content: mustache.render(
          "Muito bem, {{{user}}}. Você será conectado com {{{mentor}}}. Ele(a) entrará em contato com você em breve para te ajudar com o servidor!",
          view
        ),
      });
      return;
    }
    void this.interaction.editReply({
      content:
        "Ok. Você pode mudar de ideia a qualquer momento. Basta usar o comando `/mentor` para ser pareado com um ajudante.",
    });
  }
}
