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
import { requiredCreateCharacterFieldsDictionary } from "../../data/translations";
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
import handleError from "../../utils/handleError";
import logger from "../../utils/loggerFactory";
import numberInRange from "../../utils/numberInRange";

export type CharacterCreatorInstance = {
  interaction: ButtonInteraction | StringSelectMenuInteraction;
  form?: Partial<CreateUpdateCharacter>;
};

@Discord()
export class CharacterCreatorController {
  private characterCreatorInstances: Map<Snowflake, CharacterCreatorInstance> = new Map();
  private modals = {
    required: characterCreateModal,
    optional: characterCreateModalOptional,
  };
  private totalSteps = "0";
  private sanitizeCollections = ["races", "factions", "destinyMaidens"];
  private arrayInBackendCollections = ["races", "specs"];
  private requiredCollections = ["races", "destinyMaidens", "specs"];

  @Slash({
    name: "gerar-painel-criar-personagem",
    description: "Gera um botão para criar um personagem em um canal específico.",
    defaultMemberPermissions: [PermissionsBitField.Flags.ManageGuild],
  })
  async generateCreateBtn(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      await interaction.deferReply();
      await interaction.editReply(characterCreateTrigger);
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
    assert(
      userInstance,
      new BotError(
        'Não foi possível criar a instância do criador de personagens. O bot foi provavelmente reiniciado recentemente. Clique em "Criar Ficha" mais uma vez.'
      )
    );

    const character = await this.sendCreateRequest(userInstance);
    assert(
      character,
      new PocketBaseError(
        "Não foi possível criar o personagem. Por favor entre em contato com um administrador e tente novamente."
      )
    );

    await userInstance.interaction
      .editReply({
        content: "Personagem criado com sucesso!",
        components: [],
        embeds: [],
      })
      .catch(logger.error);

    const queueChannel = interaction.guild?.channels.cache.get(
      config.channels.createCharacterQueue
    ) as TextChannel;
    assert(queueChannel, new BotError("Não consegui achar o canal da fila de personagens."));

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

    const characterProfile = await new CharacterPost(character).createMessageOptions({
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
    assert(
      mainInstance,
      new BotError(
        'Não foi possível criar a instância do criador de personagens. O bot foi provavelmente reiniciado recentemente. Clique em "Criar Ficha" mais uma vez.'
      )
    );
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

    const isArrayInBackend = this.arrayInBackendCollections.includes(form.step.collection);

    if (state === "cancel" && mainInstance) {
      this.characterCreatorInstances.delete(interaction.user.id);
      await mainInstance.interaction.deleteReply().catch(() => null);
      return;
    }

    assert(
      mainInstance,
      new BotError(
        'Não foi possível criar a instância do criador de personagens. O bot foi provavelmente reiniciado recentemente. Clique em "Criar Ficha" mais uma vez.'
      )
    );

    if (Number(step) > form.totalSteps && interaction instanceof ButtonInteraction) {
      await this.handleTotalStepsExceeded(form, mainInstance);
      return;
    }

    if (variant === "createCharChoice") {
      const entities = await this.fetchEntities(interaction, form, itemId);
      const sanitizedFieldName = this.getSanitizedFieldName(form.step.collection);

      mainInstance.form = {
        ...mainInstance.form,
        [sanitizedFieldName]: this.getFormFieldValue(entities, isArrayInBackend),
      };

      this.characterCreatorInstances.set(interaction.user.id, mainInstance);
      this.updateFormPrompt(form, entities);
    }
    await mainInstance.interaction.editReply(form.prompt);
  }

  private getSanitizedFieldName(collection: string): keyof CreateUpdateCharacter {
    if (this.sanitizeCollections.includes(collection)) {
      collection = collection.replace(/s$/, "");
    }
    if (!(collection in createUpdateCharacterSchema.keyof().Enum)) {
      throw new BotError(
        `Não foi possível encontrar o campo sanitizado para a coleção ${collection}. Contate um administrador.`
      );
    }

    return collection as keyof CreateUpdateCharacter;
  }

  private getFormFieldValue(
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

  private async handleTotalStepsExceeded(
    form: Awaited<ReturnType<typeof characterCreateForm>>,
    mainInstance: CharacterCreatorInstance
  ): Promise<void> {
    const lastStepForm = characterCreateModalTrigger(false, form.totalSteps.toString());

    const missingRequiredFields = this.requiredCollections.map((collection) => {
      const sanitizedFieldName = this.getSanitizedFieldName(collection);
      if (!mainInstance.form?.[sanitizedFieldName]) {
        return collection;
      }
      return null;
    });

    if (missingRequiredFields.some((field) => Boolean(field))) {
      const listFmt = new Intl.ListFormat("pt-BR", {
        style: "long",
        type: "conjunction",
      });

      lastStepForm.setEmbedDescription(
        mustache.render(
          "# ⚠️ Você ainda não preencheu os campos obrigatórios: {{{fields}}}. Isso resultará em um erro ao tentar criar o personagem. Por favor retorne e escolha-os.",
          {
            fields: listFmt.format(
              missingRequiredFields
                .filter(
                  (field): field is keyof typeof requiredCreateCharacterFieldsDictionary =>
                    Boolean(field) &&
                    typeof field === "string" &&
                    field in requiredCreateCharacterFieldsDictionary
                )
                .map((field) => {
                  return requiredCreateCharacterFieldsDictionary[field];
                })
            ),
          }
        )
      );
    }

    await mainInstance.interaction.editReply(lastStepForm);
    this.totalSteps = form.totalSteps.toString();
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
    return [
      PocketBase.getImageUrl({ record: firstEntity, fileName: firstEntity.image }),
      PocketBase.getImageUrl({ record: secondEntity, fileName: secondEntity.image }),
    ];
  }

  private async getCreatorInstance(
    interaction: ButtonInteraction | StringSelectMenuInteraction | ModalSubmitInteraction
  ) {
    const [_, state] = interaction.customId.split(":");
    const oldInstance = this.characterCreatorInstances.get(interaction.user.id);
    if (state === "start" && oldInstance) {
      this.characterCreatorInstances.delete(interaction.user.id);
      await oldInstance.interaction.deleteReply().catch(() => null);
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
      await interaction.deferReply({ ephemeral: true });
      await interaction.deleteReply().catch(() => null);
    }
    return instance;
  }

  private async showCharacterModal(interaction: ButtonInteraction) {
    const [_, _state, requiredOrOptional] = interaction.customId.split(":");
    const modal = this.modals[requiredOrOptional as "required" | "optional"];
    await interaction.showModal(modal);
  }

  private sendCreateRequest(
    instance: NonNullable<Awaited<ReturnType<typeof this.getCreatorInstance>>>
  ) {
    const { form } = instance;
    assert(
      form,
      new BotError(
        "Não foi possível encontrar o formulário. O bot foi muito provavelmente reiniciado. Tente novamente."
      )
    );

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
