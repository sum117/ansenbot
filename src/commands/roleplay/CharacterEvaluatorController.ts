import assert from "assert";
import type { ButtonInteraction, ModalSubmitInteraction, TextChannel } from "discord.js";
import { EmbedBuilder, PermissionsBitField, TextInputStyle, userMention } from "discord.js";
import { ButtonComponent, Discord, ModalComponent } from "discordx";
import mustache from "mustache";

import config from "../../../config.json" assert { type: "json" };
import promptBox from "../../lib/discord/UI/helpers/promptBox";
import CharacterFetcher from "../../lib/pocketbase/CharacterFetcher";
import deleteDiscordMessage from "../../utils/deleteDiscordMessage";
import { BotError } from "../../utils/Errors";
import handleError from "../../utils/handleError";
import replyOrFollowUp from "../../utils/replyOrFollowUp";

@Discord()
export class CharacterEvaluatorController {
  private _interaction: ButtonInteraction | null = null;

  get interaction(): ButtonInteraction {
    if (!this._interaction) {
      throw new BotError(
        "A interação do bot não foi definida ainda. Por favor entre em contato com um administrador."
      );
    }
    return this._interaction;
  }

  set interaction(interaction: ButtonInteraction) {
    this._interaction = interaction;
  }

  @ButtonComponent({
    id: /character:(approve|deny):\w+:\d+/,
  })
  async evaluateCharacter(interaction: ButtonInteraction): Promise<void> {
    try {
      if (
        interaction.inCachedGuild() &&
        !interaction.member?.permissions.has(PermissionsBitField.Flags.ManageGuild)
      ) {
        await replyOrFollowUp(
          interaction,
          "Você não tem permissão para aprovar ou reprovar personagens"
        );
        return;
      }
      const [_, action, characterId, characterPlayerId] = interaction.customId.split(":") as [
        "character",
        "approve" | "deny",
        string,
        string
      ];
      this._interaction = interaction;

      if (action === "approve") {
        await this.approveCharacter();
      } else if (action === "deny") {
        await this.requireDenyReason(characterId, characterPlayerId);
      }
    } catch (error) {
      handleError(interaction, error);
    }
  }

  @ModalComponent({
    id: /character:deny:\w+:\d+/,
  })
  async denyCharacter(interaction: ModalSubmitInteraction): Promise<void> {
    try {
      await interaction.deferReply({ ephemeral: true });
      const [_, _action, characterId, characterPlayerId] = interaction.customId.split(":") as [
        "character",
        "deny",
        string,
        string
      ];
      const denyChannel = (await interaction.client.channels.cache.get(
        config.channels.createCharacterDenied
      )) as TextChannel;
      assert(
        denyChannel,
        new BotError("Não foi possível encontrar o canal de reprovação de personagens.")
      );

      const denyReason = interaction.fields.getTextInputValue(
        `character:deny:${characterId}:${characterPlayerId}`
      );
      await CharacterFetcher.deleteCharacter(characterPlayerId, characterId);

      const view = {
        staff: userMention(interaction.user.id),
        owner: userMention(characterPlayerId),
        reason: denyReason,
      };

      await denyChannel.send({
        content: mustache.render(
          "**❌ Personagem de {{{owner}}} rejeitado por {{{staff}}}:**\n{{{reason}}}",
          view
        ),
      });
      await interaction.deleteReply().catch(() => null);
      await deleteDiscordMessage(this.interaction.message, 0);
    } catch (error) {
      handleError(interaction, error);
    }
  }

  private async approveCharacter() {
    await this.interaction.deferReply({ ephemeral: true });
    const approvedCharacterChannel = (await this.interaction.client.channels.cache.get(
      config.channels.createCharacterApproved
    )) as TextChannel;
    assert(
      approvedCharacterChannel,
      new BotError("Não consegui achar o canal de personagens aprovados.")
    );

    const approvedCharacterEmbed = EmbedBuilder.from(this.interaction.message.embeds[0]);
    const embedFields = approvedCharacterEmbed.data.fields;
    assert(
      embedFields,
      new BotError(
        "Houve um erro ao gerar o embed do personagem aprovado. Por favor entre em contato com um administrador."
      )
    );

    const view = {
      staff: userMention(this.interaction.user.id),
      owner: embedFields.find((field) => field.name === "Dono")?.value,
    };
    approvedCharacterEmbed.setFields(
      embedFields.filter((field) => field.name !== "Dono" && field.name !== "Skills")
    );

    await this.interaction.deleteReply().catch(() => null);
    await deleteDiscordMessage(this.interaction.message, 0);
    await approvedCharacterChannel.send({
      content: mustache.render("Personagem de {{{owner}}} aprovado por {{{staff}}}", view),
      embeds: [approvedCharacterEmbed],
    });
  }

  private async requireDenyReason(characterId: string, characterPlayerId: string) {
    const denyReason = await promptBox({
      label: "Motivo da rejeição",
      style: TextInputStyle.Paragraph,
      title: "Motivo da rejeição",
      inputAndModalCustomId: `character:deny:${characterId}:${characterPlayerId}`,
      placeholder: "Digite o motivo da rejeição",
      required: true,
    });
    await this.interaction.showModal(denyReason);
  }
}
