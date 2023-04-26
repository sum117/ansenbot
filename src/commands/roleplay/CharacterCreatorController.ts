import assert from "assert";
import type {
  ChatInputCommandInteraction,
  Snowflake,
  StringSelectMenuInteraction,
  TextChannel,
} from "discord.js";
import {
  ButtonInteraction,
  ModalSubmitInteraction,
  PermissionsBitField,
  roleMention,
  userMention,
} from "discord.js";
import { ButtonComponent, Discord, ModalComponent, SelectMenuComponent, Slash } from "discordx";

import characterCreateForm from "../../lib/discord/UI/forms/characterCreateForm";
import {
  characterCreateModal,
  characterCreateModalOptional,
} from "../../lib/discord/UI/forms/characterCreateModal";
import characterCreateTrigger from "../../lib/discord/UI/forms/characterCreateTrigger";
import PocketBase from "../../lib/pocketbase/PocketBase";
import type { Character, CreateUpdateCharacter, Faction, Race, Spec } from "../../types/Character";
import { BotError, PocketBaseError } from "../../utils/Errors";
import handleError from "../../utils/handleError";
import imageKit from "../../utils/imageKit";
import numberInRange from "../../utils/numberInRange";
import { createUpdateCharacterSchema } from "../../schemas/characterSchema";
import CharacterFetcher from "../../lib/pocketbase/CharacterFetcher";
import { AnsenModal } from "../../lib/discord/UI/classes/AnsenModal";
import characterCreateModalTrigger from "../../lib/discord/UI/forms/characterCreateModalTrigger";
import config from "../../../config.json" assert { type: "json" };
import CharacterPost from "../../lib/discord/UI/classes/CharacterPost";
import mustache from "mustache";
import characterApprovalBtnRow from "../../lib/discord/UI/characterApprovalBtnRow";

@Discord()
export class CharacterCreatorController {
  private characterCreatorInstances: Map<
    Snowflake,
    {
      interaction: ButtonInteraction | StringSelectMenuInteraction;
      form?: Partial<CreateUpdateCharacter>;
    }
  > = new Map();
  private modals = {
    required: characterCreateModal,
    optional: characterCreateModalOptional,
  };
  private totalSteps = "0";

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

  @ModalComponent({
    id: /createChar:modal:(required|optional)/,
  })
  async handleCreateCharacterModalSubmit(interaction: ModalSubmitInteraction): Promise<void> {
    try {
      const [_, _type, requiredOrOptional] = interaction.customId.split(":");
      const modal = this.modals[requiredOrOptional as "required" | "optional"];

      await this.handleModalSteps(modal, interaction);
    } catch (error) {
      handleError(interaction, error);
    }
  }

  @ButtonComponent({
    id: /createChar:modal:(optional|required|done)/,
  })
  async handleCreateCharacterModalTrigger(interaction: ButtonInteraction): Promise<void> {
    try {
      const [_, _type, step] = interaction.customId.split(":");

      if (step === "done") {
        await this.handleDoneStep(interaction);
      } else {
        await this.showCharacterModal(interaction);
      }
    } catch (error) {
      handleError(interaction, error);
    }
  }

  private async handleDoneStep(interaction: ButtonInteraction): Promise<void> {
    const userInstance = this.characterCreatorInstances.get(interaction.user.id);
    assert(userInstance, new BotError("Could not find creator instance."));

    const character = await this.sendCreateRequest(userInstance);
    assert(character, new PocketBaseError("Could not create character."));

    await userInstance.interaction.editReply({
      content: "Personagem criado com sucesso!",
      components: [],
      embeds: [],
    });

    const queueChannel = interaction.guild?.channels.cache.get(
      config.channels.createCharacterQueue
    ) as TextChannel;
    assert(queueChannel, new BotError("Could not find queue channel."));

    await this.sendCharacterProfile(queueChannel, character);
    this.characterCreatorInstances.delete(interaction.user.id);
  }

  private async sendCharacterProfile(
    queueChannel: TextChannel,
    character: Character
  ): Promise<void> {
    const view = {
      mentions: `${roleMention(config.roles.mod)}, ${roleMention(config.roles.admin)}`,
      owner: userMention(character.playerId),
    };

    const characterProfile = new CharacterPost(character).createMessageOptions({
      to: "profile",
    });
    (characterProfile.content = mustache.render(
      "Um novo personagem de {{{owner}}} foi criado e está aguardando aprovação, {{{mentions}}}!",
      view
    )),
      (characterProfile.components = [characterApprovalBtnRow(character)]);
    await queueChannel.send(characterProfile);
  }

  private async handleModalSteps(modal: AnsenModal, interaction: ModalSubmitInteraction) {
    const customIds = modal.getFieldCustomIds();
    const mainInstance = await this.getCreatorInstance(interaction);
    assert(mainInstance, new BotError("Could not find creator instance."));
    const userInputs = customIds.map((id) => interaction.fields.getTextInputValue(id));
    const getCollectionName = (id: string) => id.split(":")[2];

    for (const [index, id] of customIds.entries()) {
      const collectionName = getCollectionName(id);
      const userInput = userInputs[index];
      mainInstance.form = {
        ...mainInstance.form,
        [collectionName]: userInput,
        age: numberInRange(18, 24),
      };
    }
    const requiredFieldsSchema = createUpdateCharacterSchema.pick({
      name: true,
      age: true,
      image: true,
      surname: true,
    });

    const requiredFields = await requiredFieldsSchema.safeParseAsync(mainInstance.form);

    if (requiredFields.success) {
      await mainInstance.interaction.editReply(characterCreateModalTrigger(true, this.totalSteps));
    }

    this.characterCreatorInstances.set(interaction.user.id, mainInstance);
  }

  private async handleCreateCharacter(
    interaction: ButtonInteraction | StringSelectMenuInteraction
  ): Promise<void> {
    const [variant, state, step, itemId] = interaction.customId.split(":");
    const form = await characterCreateForm(interaction);
    const mainInstance = await this.getCreatorInstance(interaction);

    if (state === "cancel" && mainInstance) {
      this.characterCreatorInstances.delete(interaction.user.id);
      void mainInstance.interaction.deleteReply();
      return;
    }

    assert(mainInstance, new BotError("Could not find creator instance."));

    if (Number(step) > form.totalSteps && interaction instanceof ButtonInteraction) {
      void mainInstance.interaction.editReply(
        characterCreateModalTrigger(false, form.totalSteps.toString())
      );
      this.totalSteps = form.totalSteps.toString();

      return;
    }

    if (variant === "createCharChoice") {
      const entities = await this.fetchEntities(interaction, form, itemId);
      const sanitizedFieldName = form.step.collection.replace(/s$/, "");

      mainInstance.form = {
        ...mainInstance.form,
        [sanitizedFieldName]:
          entities.length > 1 ? entities.map((entity) => entity.id) : entities[0].id,
      };

      this.characterCreatorInstances.set(interaction.user.id, mainInstance);
      this.updateFormPrompt(form, entities);
    }
    void mainInstance.interaction.editReply(form.prompt);
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

  private async getCreatorInstance(
    interaction: ButtonInteraction | StringSelectMenuInteraction | ModalSubmitInteraction
  ) {
    const [_, state] = interaction.customId.split(":");
    const oldInstance = this.characterCreatorInstances.get(interaction.user.id);
    if (state === "start" && oldInstance) {
      this.characterCreatorInstances.delete(interaction.user.id);
      void oldInstance.interaction.deleteReply();
    }

    if (
      !this.characterCreatorInstances.has(interaction.user.id) &&
      !(interaction instanceof ModalSubmitInteraction)
    ) {
      this.characterCreatorInstances.set(interaction.user.id, { interaction });
      await interaction.deferReply({ ephemeral: true });
    }
    const instance = this.characterCreatorInstances.get(interaction.user.id);
    if (interaction.id !== instance?.interaction.id) {
      void interaction.deferReply({ ephemeral: true });
      void interaction.deleteReply();
    }
    return instance;
  }

  private showCharacterModal(interaction: ButtonInteraction) {
    const [_, state, requiredOrOptional] = interaction.customId.split(":");
    const modal = this.modals[requiredOrOptional as "required" | "optional"];
    void interaction.showModal(modal);
  }

  private sendCreateRequest(
    instance: NonNullable<Awaited<ReturnType<typeof this.getCreatorInstance>>>
  ) {
    const { form } = instance;
    assert(form, new BotError("Could not find form data."));
    form.level = 4;
    form.reputation = 0;
    form.skills = "";
    form.status = "";
    form.memory = "";
    form.playerId = instance.interaction.user.id;
    form.player = "";
    form.posts = [""];
    form.xp = 0;
    form.skillPoints = 0;
    form.ascendedSkills = [];
    form.skillTraits = [];

    const character = createUpdateCharacterSchema.parse(form);
    return CharacterFetcher.createCharacter(character, instance.interaction.user.id);
  }
}
