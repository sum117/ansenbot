import type { TextInputStyle } from "discord.js";
import { ActionRowBuilder, ModalBuilder, TextInputBuilder } from "discord.js";

export interface AnsenModalOptions {
  title: string;
  customId: string;
}

export interface AnsenModalTextInputOptions {
  label: string;
  style: TextInputStyle;
  placeholder: string;
  customId: string;
  value?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
}

export class AnsenModal extends ModalBuilder {
  public constructor(public options: AnsenModalOptions) {
    super();
    this.setCustomId(options.customId);
    this.setTitle(options.title);
  }

  public static makeField(options: AnsenModalTextInputOptions): AnsenModalTextInputOptions {
    return options;
  }

  public getFieldCustomIds(): string[] {
    return this.components.reduce((acc, row) => {
      const inputIds = row.components
        .map((input) => input.data.custom_id)
        .filter(Boolean) as string[];
      return [...acc, ...inputIds];
    }, [] as string[]);
  }

  public addFields(fields: AnsenModalTextInputOptions[]): this {
    fields.forEach((field) => this.addField(field));
    return this;
  }

  public addField({
    label,
    style,
    customId,
    required = false,
    placeholder,
    value,
    minLength,
    maxLength,
  }: AnsenModalTextInputOptions): this {
    const input = new TextInputBuilder()
      .setPlaceholder(placeholder)
      .setLabel(label)
      .setStyle(style)
      .setCustomId(customId)
      .setRequired(required);

    if (value) {
      input.setValue(value);
    }

    if (minLength) {
      input.setMinLength(minLength);
    }

    if (maxLength) {
      input.setMaxLength(maxLength);
    }
    this.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
    return this;
  }
}
