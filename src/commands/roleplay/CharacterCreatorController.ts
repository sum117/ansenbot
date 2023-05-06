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
import mustache from "mustache";

import config from "../../../config.json" assert { type: "json" };
import characterApprovalBtnRow from "../../lib/discord/UI/character/characterApprovalBtnRow";
import characterCreateForm from "../../lib/discord/UI/character/characterCreateForm";
import {
  characterCreateModal,
  characterCreateModalOptional,
} from "../../lib/discord/UI/character/characterCreateModal";
import characterCreateModalTrigger from "../../lib/discord/UI/character/characterCreateModalTrigger";
import characterCreateTrigger from "../../lib/discord/UI/character/characterCreateTrigger";
import type { AnsenModal } from "../../lib/discord/UI/classes/AnsenModal";
import CharacterPost from "../../lib/discord/UI/classes/CharacterPost";
import CharacterFetcher from "../../lib/pocketbase/CharacterFetcher";
import PocketBase from "../../lib/pocketbase/PocketBase";
import { createUpdateCharacterSchema } from "../../schemas/characterSchema";
import type { Character, CreateUpdateCharacter, Faction, Race, Spec } from "../../types/Character";
import { BotError, PocketBaseError } from "../../utils/Errors";
import getCombinedImageUrl from "../../utils/getCombinedImageUrl";
import getPocketbaseImageUrl from "../../utils/getPocketbaseImageUrl";
import handleError from "../../utils/handleError";
import numberInRange from "../../utils/numberInRange";

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
    characterProfile.content = mustache.render(
      "Um novo personagem de {{{owner}}} foi criado e está aguardando aprovação, {{{mentions}}}!",
      view
    );
    characterProfile.components = [characterApprovalBtnRow(character)];
    await queueChannel.send(characterProfile);
  }

  private async handleModalSteps(modal: AnsenModal, interaction: ModalSubmitInteraction) {
    const customIds = modal.getFieldCustomIds();
    const mainInstance = await this.getCreatorInstance(interaction);
    assert(mainInstance, new BotError("Could not find creator instance."));
    const userInputs = customIds.map((id) => interaction.fields.getTextInputValue(id));
    const getFieldName = (id: string) => id.split(":")[2];

    for (const [index, id] of customIds.entries()) {
      const fieldName = getFieldName(id);
      const userInput = userInputs[index];
      const getValidAge = (age: string) => {
        const parsedAge = Number(age);
        const isValidAge = !isNaN(parsedAge);
        if (isValidAge) {
          return parsedAge;
        }
        return numberInRange(18, 24);
      };
      mainInstance.form = {
        ...mainInstance.form,
        [fieldName]: fieldName === "age" ? getValidAge(userInput) : userInput,
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

      // Define a list of collections that should be sanitized
      const sanitizeCollections = ["races", "factions", "destinyMaidens"];

      // Define a list of collections that have an array in the backend
      const arrayInBackendCollections = ["races", "specs"];

      /**
       * Get the sanitized field name for the form.
       * @param collection The collection name.
       * @returns The sanitized field name.
       */
      function getSanitizedFieldName(collection: string): string {
        if (sanitizeCollections.includes(collection)) {
          return collection.replace(/s$/, "");
        }
        return collection;
      }

      /**
       * Get the value for the form field based on entities and the backend structure.
       * @param entities The entities list.
       * @param isArrayInBackend Indicates if the collection has an array in the backend.
       * @returns The value for the form field.
       */
      function getFormFieldValue(
        entities: (Race | Faction | Spec)[],
        isArrayInBackend: boolean
      ): string | string[] {
        if (entities.length > 1) {
          return entities.map((entity) => entity.id);
        }

        if (isArrayInBackend) {
          return [entities[0].id];
        }

        return entities[0].id;
      }

      // Obtain the sanitized field name
      const sanitizedFieldName = getSanitizedFieldName(form.step.collection);

      // Determine if the collection has an array in the backend
      const isArrayInBackend = arrayInBackendCollections.includes(form.step.collection);

      // Update the main instance form
      mainInstance.form = {
        ...mainInstance.form,
        [sanitizedFieldName]: getFormFieldValue(entities, isArrayInBackend),
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
    const imageUrl = getCombinedImageUrl(firstUrl, secondUrl);

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
    return [getPocketbaseImageUrl(firstEntity), getPocketbaseImageUrl(secondEntity)];
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
    const [_, _state, requiredOrOptional] = interaction.customId.split(":");
    const modal = this.modals[requiredOrOptional as "required" | "optional"];
    void interaction.showModal(modal);
  }

  private sendCreateRequest(
    instance: NonNullable<Awaited<ReturnType<typeof this.getCreatorInstance>>>
  ) {
    const { form } = instance;
    assert(form, new BotError("Could not find form data."));

    // Initialize default form values
    const defaultFormData = {
      level: 4,
      reputation: 0,
      skills: "",
      status: "",
      memory: "",
      playerId: instance.interaction.user.id,
      player: "",
      posts: [""],
      xp: 0,
      skillPoints: 0,
      ascendedSkills: [],
      skillTraits: [],
      body: "",
      inventory: "",
    };
    const updatedForm = { ...defaultFormData, ...form };
    const character = createUpdateCharacterSchema.parse(updatedForm);
    return CharacterFetcher.createCharacter(character);
  }
}
