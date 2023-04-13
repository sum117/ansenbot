import type { GuildMemberRoleManager, Role, StringSelectMenuInteraction } from "discord.js";
import { userMention } from "discord.js";
import type { ArgsOf } from "discordx";
import { Discord, On, SelectMenuComponent } from "discordx";
import mustache from "mustache";

import { JOIN_FORM_VALUES } from "../data/constants";
import { onJoinForm } from "../data/forms";
import MultiForm from "../lib/discord/Prompt/MultiForm";
import type { Properties } from "../types/Utils";
import deleteDiscordMessage from "../utils/deleteDiscordMessage";

@Discord()
export class OnJoinUserManagement {
  private _interaction: StringSelectMenuInteraction | null = null;

  set interaction(interaction: StringSelectMenuInteraction) {
    this._interaction = interaction;
  }

  get interaction(): StringSelectMenuInteraction {
    if (!this._interaction) {
      throw new Error("Cannot manage user with invalid interaction");
    }
    return this._interaction;
  }

  get memberRoleManager(): GuildMemberRoleManager {
    if (this.interaction.inCachedGuild()) {
      return this.interaction.member.roles;
    } else {
      throw new Error("Cannot manage user with invalid interaction");
    }
  }

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

    if (this.interaction.replied) {
      void this.interaction.followUp({
        content: "Você já respondeu a essa pergunta!",
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });
    switch (interaction.customId) {
      case "joinForm:mentor": {
        void this.handleMentorSelection();
        break;
      }
      case "joinForm:gender": {
        void this.handleGenderSelection();
        break;
      }
    }
  }

  private handleGenderSelection(): void {
    const values = this.interaction.values as Properties<
      Pick<typeof JOIN_FORM_VALUES, "male" | "female" | "other">
    >[];

    const genderRoles = {
      female: this.getRoleByName("Mulher"),
      male: this.getRoleByName("Homem"),
      other: this.getRoleByName("Outro"),
    } as Record<Properties<Pick<typeof JOIN_FORM_VALUES, "male" | "female" | "other">>, Role>;

    const chosenRole = genderRoles[values[0]];

    void this.memberRoleManager.add(chosenRole);
    for (const role of Object.values(genderRoles)) {
      if (role.name === chosenRole.name) {
        return;
      }
      void this.memberRoleManager.remove(role);
    }
    void this.interaction.editReply({
      content: mustache.render("Você foi setado com a sua preferência de genero: {{{role}}}", {
        role: chosenRole.name,
      }),
    });
  }

  private async handleMentorSelection(): Promise<void> {
    const values = this.interaction.values as Properties<typeof JOIN_FORM_VALUES>[];

    if (values[0] === JOIN_FORM_VALUES.wantsMentor) {
      const mentorChannel = this.interaction.guild?.channels.cache.find(
        (channel) => channel.name === "mentoria"
      );

      if (!mentorChannel?.isTextBased()) {
        return;
      }

      const possibleMentors = (await this.interaction.guild?.members.fetch())?.filter((member) => {
        return member.roles.cache.find(
          (role) => role.name === "Administrador" || role.name === "Moderador"
        );
      });

      const mentor = possibleMentors?.random(1).at(0);
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

  private getRoleByName(roleName: string): Role | undefined {
    return this.interaction.guild?.roles.cache.find(({ name }) => name === roleName);
  }
}
