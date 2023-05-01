import type { TextInputStyle } from "discord.js";
import { ActionRowBuilder, ModalBuilder, TextInputBuilder } from "discord.js";

type PromptBoxOptions = {
  inputAndModalCustomId: string;
  placeholder: string;
  value?: string;
  required?: boolean;
  title: string;
  maxLength?: number;
  minLength?: number;
  style: TextInputStyle;
  label: string;
};
const promptBox = ({
  inputAndModalCustomId,
  placeholder,
  value,
  required = true,
  title,
  minLength,
  maxLength,
  label,
  style,
}: PromptBoxOptions): ModalBuilder => {
  const input = new TextInputBuilder()
    .setCustomId(inputAndModalCustomId)
    .setPlaceholder(placeholder)
    .setRequired(required)
    .setLabel(label)
    .setStyle(style);

  if (minLength) {
    input.setMinLength(minLength);
  }
  if (maxLength) {
    input.setMaxLength(maxLength);
  }
  if (value) {
    input.setValue(value);
  }
  return new ModalBuilder()
    .setCustomId(inputAndModalCustomId)
    .setTitle(title)
    .addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
};

export default promptBox;
