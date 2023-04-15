import assert from "assert";
import axios from "axios";
import type {
  APIButtonComponent,
  ButtonInteraction,
  Message,
  ModalBuilder,
  ModalSubmitInteraction,
} from "discord.js";
import { TextInputStyle } from "discord.js";
import type { ZodOptional, ZodString } from "zod";

import editCharacterForm from "../../../../data/forms/editCharacterForm";
import promptBox from "../../../../data/modals/promptBox";
import { createUpdateCharacterSchema } from "../../../../schemas/characterSchema";
import { isImageUrl } from "../../../../schemas/utiltitySchemas";
import type { Character, CredentialsArray } from "../../../../types/Character";
import { BotError } from "../../../../utils/Errors";
import getZodStringLength from "../../../../utils/getZodStringLength";
import handleError from "../../../../utils/handleError";
import CharacterFetcher from "../../../pocketbase/CharacterFetcher";
import PocketBase from "../../../pocketbase/PocketBase";

export class CharacterEditor {
  private readonly interaction: ModalSubmitInteraction | ButtonInteraction;

  constructor(interaction: ModalSubmitInteraction | ButtonInteraction) {
    this.interaction = interaction;
  }

  async handleEditCharacterButton(): Promise<void> {
    if (!this.interaction.isButton()) {
      throw new BotError("Ocorreu um erro ao tentar editar o personagem.");
    }
    try {
      const field = this.interaction.component.label;
      if (!field) {
        throw new BotError("Não foi possível encontrar o campo do personagem.");
      }
      const [_, action, characterId] = this.getInteractionCredentials();
      const character = await CharacterFetcher.getCharacterById(characterId);
      const length = this.getLengths(action);
      const value = this.getCharacterUpdateValue(character, action);

      const modal = this.createModal(action, characterId, character.name, field, length, value);
      void this.interaction.showModal(modal);
    } catch (error) {
      handleError(this.interaction, error);
    }
  }

  async handleEditSubmit(): Promise<void> {
    try {
      const formMessage = this.getFormMessage();
      await this.interaction.deferReply();
      const [_, action, characterId] = this.getInteractionCredentials();
      const character = await CharacterFetcher.getCharacterById(characterId);
      const label = this.getLabel(action);
      const value = this.getValue();

      if (action === "image") {
        const imageForm = new FormData();
        const { fileName, blob } = await this.getImageBlob(value);
        imageForm.append("file", blob, fileName);
        await PocketBase.updateEntityWithFormData(characterId, "characters", imageForm);
      } else {
        character[action] = value;
        await this.validateAndUpdateCharacter(character);
      }
      await this.updateFormMessage(formMessage, label);
      void this.interaction.deleteReply();
    } catch (error) {
      handleError(this.interaction, error);
    }
  }

  private getFormMessage(): Message {
    const formMessage = this.interaction.message;
    if (!formMessage) {
      throw new BotError("Não foi possível encontrar a mensagem do formulário.");
    }
    return formMessage;
  }

  private getInteractionCredentials(): CredentialsArray {
    return this.interaction.customId.split(":") as CredentialsArray;
  }

  private getValue(): string {
    return (this.interaction as ModalSubmitInteraction).fields.getTextInputValue(
      this.interaction.customId
    );
  }

  private getLabel(action: string): string | undefined {
    const button = this.interaction.message?.components[0].components.find((component) => {
      return component.customId?.includes(action);
    });
    return (button as APIButtonComponent).label;
  }

  private async getImageBlob(value: string): Promise<{
    fileName: string;
    blob: Blob;
  }> {
    const imageUrl = value.replace(/\?.*/, "");
    const image = await isImageUrl.parseAsync(imageUrl);
    const response = await axios.get(image, { responseType: "arraybuffer" });
    const fileName = image.split("/").pop();
    assert(fileName, "Não foi possível encontrar o nome do arquivo.");
    return {
      fileName,
      blob: new Blob([response.data], { type: response.headers["content-type"] }),
    };
  }

  private async validateAndUpdateCharacter(character: Character): Promise<void> {
    await createUpdateCharacterSchema.omit({ image: true }).parseAsync(character);
    await PocketBase.updateEntity({
      entityType: "characters",
      entityData: character,
    });
  }

  private async updateFormMessage(formMessage: Message, label: string | undefined): Promise<void> {
    const newForm = await editCharacterForm(this.interaction as ModalSubmitInteraction);
    void formMessage.edit(newForm.setMessageContent(`✅ Última edição: ${label}`));
  }

  private createModal(
    action: string,
    characterId: string,
    characterName: string,
    field: string,
    length: { min?: number; max?: number },
    value: string
  ): ModalBuilder {
    return promptBox({
      inputAndModalCustomId: `editChar:${action}:${characterId}`,
      title: `Editar ${characterName}`,
      maxLength: length.max,
      minLength: length.min,
      label: `Novo(a) ${field}`,
      placeholder: `Digite aqui o novo ${field}`,
      required: true,
      style: length.max && length.max > 128 ? TextInputStyle.Paragraph : TextInputStyle.Short,
      value: String(value) ?? undefined,
    });
  }

  private getCharacterUpdateValue(character: Character, action: string): string {
    let value = character[action as keyof typeof character] ?? "";
    if (action === "image") {
      value = PocketBase.getImageUrl({
        record: character,
        fileName: character.image,
      });
    }
    return String(value);
  }

  private getLengths(action: CredentialsArray[1]): { min?: number; max?: number } {
    const zodKey = createUpdateCharacterSchema.shape[action] as ZodOptional<ZodString> | ZodString;
    return getZodStringLength(zodKey);
  }
}
