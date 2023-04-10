import { StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js";

import type { Prompt } from "../types/MultiForm";
import { JOIN_FORM_VALUES } from "./constants";

export const baseForm = ({
  description,
  fields,
  title,
  imageUrl,
  embedColor,
}: Prompt): Prompt & {
  fieldsCustomIds: (string | undefined)[];
} => ({
  description,
  embedColor,
  fields,
  get fieldsCustomIds() {
    return this.fields.map((field) => field.data.custom_id).filter(Boolean);
  },
  imageUrl,
  title,
});

/**
 * @description Formulário de registro de novos membros no servidor
 */
export const onJoinForm = baseForm({
  description:
    "Bem vindo ao {{{server}}}, {{{user}}}! Prossiga com o seu registro utilizando os seletores abaixo.",
  embedColor: "#be4e58",

  fields: [
    new StringSelectMenuBuilder()
      .setCustomId("joinForm:mentor")
      .setPlaceholder("Você gostaria de ser acompanhado por um mentor?")
      .setMaxValues(1)
      .addOptions([
        new StringSelectMenuOptionBuilder().setLabel("Sim").setValue(JOIN_FORM_VALUES.wantsMentor),
        new StringSelectMenuOptionBuilder().setLabel("Não").setValue(JOIN_FORM_VALUES.noMentor),
      ]),
    new StringSelectMenuBuilder()
      .setCustomId("joinForm:gender")
      .setPlaceholder("Como você se identifica?")
      .setMaxValues(1)
      .addOptions([
        new StringSelectMenuOptionBuilder().setLabel("Homem").setValue(JOIN_FORM_VALUES.male),
        new StringSelectMenuOptionBuilder().setLabel("Mulher").setValue(JOIN_FORM_VALUES.female),
        new StringSelectMenuOptionBuilder().setLabel("Outro").setValue(JOIN_FORM_VALUES.other),
      ]),
    new StringSelectMenuBuilder()
      .setCustomId("joinForm:writingStyle")
      .setPlaceholder("Qual o seu estilo de escrita?")
      .setMaxValues(3)
      .addOptions([
        new StringSelectMenuOptionBuilder().setLabel("Página").setValue(JOIN_FORM_VALUES.page),
        new StringSelectMenuOptionBuilder()
          .setLabel("Parágrafo")
          .setValue(JOIN_FORM_VALUES.paragraph),
        new StringSelectMenuOptionBuilder().setLabel("Linha").setValue(JOIN_FORM_VALUES.line),
      ]),
    new StringSelectMenuBuilder()
      .setCustomId("joinForm:age")
      .setPlaceholder("Qual a sua idade?")
      .setMaxValues(3)
      .addOptions([
        new StringSelectMenuOptionBuilder().setLabel("13-14").setValue(JOIN_FORM_VALUES.kid),
        new StringSelectMenuOptionBuilder().setLabel("15-17").setValue(JOIN_FORM_VALUES.teen),
        new StringSelectMenuOptionBuilder().setLabel("18+").setValue(JOIN_FORM_VALUES.adult),
      ]),
  ],
  imageUrl: "https://i.imgur.com/Lm9bHWk.png",
  title: "Registro",
});
