import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";

import getGachaId from "../helpers/getGachaId";

export const gachaItemKeepModal = new ModalBuilder()
  .setTitle("Novo Item")
  .setCustomId(getGachaId("modal"))
  .addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder()
        .setLabel("Nome para o seu novo item")
        .setPlaceholder("Espada de Fogo de Ghanliew")
        .setStyle(TextInputStyle.Short)
        .setMaxLength(128)
        .setRequired(true)
        .setCustomId(`${getGachaId("modal")}:name`)
    ),
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder()
        .setLabel("Descrição para o seu novo item")
        .setPlaceholder("Uma espada que queima com o poder de Ghanliew")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(1024)
        .setCustomId(`${getGachaId("modal")}:description`)
    )
  );
