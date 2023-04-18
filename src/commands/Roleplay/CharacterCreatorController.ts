import assert from "assert";
import type {
  ButtonInteraction,
  ChatInputCommandInteraction,
  Snowflake,
  StringSelectMenuInteraction,
} from "discord.js";
import { PermissionsBitField } from "discord.js";
import { ButtonComponent, Discord, SelectMenuComponent, Slash } from "discordx";

import characterCreateForm from "../../lib/discord/Prompt/forms/characterCreateForm";
import characterCreateTrigger from "../../lib/discord/Prompt/forms/characterCreateTrigger";
import PocketBase from "../../lib/pocketbase/PocketBase";
import type { Faction, Race, Spec } from "../../types/Character";
import { BotError } from "../../utils/Errors";
import handleError from "../../utils/handleError";
import imageKit from "../../utils/imageKit";

@Discord()
export class CharacterCreatorController {
  private characterCreatorInstances: Map<
    Snowflake,
    ButtonInteraction | StringSelectMenuInteraction
  > = new Map();

  @Slash({
    name: "gerar-painel-criar-personagem",
    description: "Gera um botão para criar um personagem em um canal específico.",
    defaultMemberPermissions: [PermissionsBitField.Flags.ManageGuild],
  })
  async generateCreateBtn(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      await interaction.deferReply();
      void interaction.editReply(characterCreateTrigger);
    } catch (error) {
      handleError(interaction, error);
    }
  }

  @ButtonComponent({
    id: /createChar(Choice)?:\w+:\d+:\w+/,
  })
  async handleCreateCharacterButton(interaction: ButtonInteraction): Promise<void> {
    try {
      await this.handleCreateCharacter(interaction);
    } catch (error) {
      handleError(interaction, error);
    }
  }

  @SelectMenuComponent({
    id: /createChar(Choice)?:\w+:\d+:\w+/,
  })
  async handleCreateCharacterSelect(interaction: StringSelectMenuInteraction): Promise<void> {
    try {
      await this.handleCreateCharacter(interaction);
    } catch (error) {
      handleError(interaction, error);
    }
  }

  private async handleCreateCharacter(
    interaction: ButtonInteraction | StringSelectMenuInteraction
  ): Promise<void> {
    const [variant, _state, _step, itemId] = interaction.customId.split(":");
    const mainInteraction = await this.getCreatorInstance(interaction);
    assert(mainInteraction, new BotError("Could not find creator instance."));

    const form = await characterCreateForm(interaction);

    if (variant === "createCharChoice") {
      const entities = await this.fetchEntities(interaction, form, itemId);
      this.updateFormPrompt(form, entities);
    }
    void mainInteraction.editReply(form.prompt);
  }

  private async fetchEntities(
    interaction: ButtonInteraction | StringSelectMenuInteraction,
    form: Awaited<ReturnType<typeof characterCreateForm>>,
    itemId: string
  ): Promise<(Race | Faction | Spec)[]> {
    return interaction.isStringSelectMenu()
      ? Promise.all(
          interaction.values.map((value) => {
            return PocketBase.getEntityById<Race | Faction | Spec>({
              entityType: form.step.collection,
              id: value,
            });
          })
        )
      : [
          await PocketBase.getEntityById<Race | Faction | Spec>({
            entityType: form.step.collection,
            id: itemId,
          }),
        ];
  }

  private updateFormPrompt(
    form: Awaited<ReturnType<typeof characterCreateForm>>,
    entities: (Race | Faction | Spec)[]
  ): void {
    const [firstEntity, secondEntity] = entities;

    if (secondEntity) {
      this.updateFormPromptForHybrid(form, firstEntity, secondEntity);
    } else {
      this.updateFormPromptForSingleEntity(form, firstEntity);
    }
  }

  private updateFormPromptForHybrid(
    form: Awaited<ReturnType<typeof characterCreateForm>>,
    firstEntity: Race | Faction | Spec,
    secondEntity: Race | Faction | Spec
  ): void {
    form.prompt.setEmbedTitle(`Hibrido de ${firstEntity.name} e ${secondEntity.name}`);
    form.prompt.setEmbedDescription(
      [firstEntity.description, secondEntity.description].join("\n\n *** \n\n")
    );

    const [firstUrl, secondUrl] = this.getFormattedImageUrls(firstEntity, secondEntity);
    const imageUrl = this.getCombinedImageUrl(firstUrl, secondUrl);

    form.prompt.setEmbedImage(imageUrl);
  }

  private updateFormPromptForSingleEntity(
    form: Awaited<ReturnType<typeof characterCreateForm>>,
    entity: Race | Faction | Spec
  ): void {
    form.prompt.setEmbedTitle(entity.name);
    form.prompt.setEmbedDescription(entity.description);
    form.prompt.setEmbedImage(
      PocketBase.getImageUrl({
        record: entity,
        fileName: entity.image,
      })
    );
  }

  private getFormattedImageUrls(
    firstEntity: Race | Faction | Spec,
    secondEntity: Race | Faction | Spec
  ): [string, string] {
    return [
      PocketBase.getImageUrl({
        record: firstEntity,
        fileName: firstEntity.image,
      }),
      PocketBase.getImageUrl({
        record: secondEntity,
        fileName: secondEntity.image,
      }),
    ].map((url) =>
      url.replace(process.env.POCKETBASE_URL + "api/files", "").replace(/\?.*/, "")
    ) as [string, string];
  }

  private getCombinedImageUrl(firstUrl: string, secondUrl: string): string {
    return imageKit.url({
      path: "white-canvas_hc5p34kAV.png",
      transformation: [
        {
          width: 768,
          height: 512,
          aspectRatio: "1:1",
          cropMode: "pad",
          background: "transparent",
        },
        {
          overlayImage: secondUrl,
          overlayWidth: "384",
          overlayHeight: "512",
          overlayX: "0",
          overlayY: "0",
        },
        {
          overlayImage: firstUrl,
          overlayWidth: "384",
          overlayHeight: "512",
          overlayX: "384",
          overlayY: "0",
        },
      ],
    });
  }

  private async getCreatorInstance(interaction: ButtonInteraction | StringSelectMenuInteraction) {
    const [_, state] = interaction.customId.split(":");
    const oldInstance = this.characterCreatorInstances.get(interaction.user.id);
    if (state === "start" && oldInstance) {
      this.characterCreatorInstances.delete(interaction.user.id);
      void oldInstance.deleteReply();
    }
    if (!this.characterCreatorInstances.has(interaction.user.id)) {
      this.characterCreatorInstances.set(interaction.user.id, interaction);
      await interaction.deferReply({ ephemeral: true });
    }
    const instance = this.characterCreatorInstances.get(interaction.user.id);
    if (interaction.id !== instance?.id) {
      void interaction.deferReply({ ephemeral: true });
      void interaction.deleteReply();
    }
    return instance;
  }
}
