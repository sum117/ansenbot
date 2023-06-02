import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  UserSelectMenuBuilder,
} from "discord.js";

export const confirmButton = new ActionRowBuilder<ButtonBuilder>().setComponents(
  new ButtonBuilder()
    .setCustomId("inventory:give:confirm")
    .setLabel("Confirmar")
    .setStyle(ButtonStyle.Success)
);

export const userSelectMenu = new ActionRowBuilder<UserSelectMenuBuilder>().setComponents(
  new UserSelectMenuBuilder()
    .setCustomId("inventory:give:user")
    .setMaxValues(1)
    .setPlaceholder("Selecione um jogador")
);
export const quantitySelectMenu = new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(
  new StringSelectMenuBuilder()
    .setCustomId("inventory:give:quantity")
    .setPlaceholder("Selecione a quantidade")
    .addOptions([
      new StringSelectMenuOptionBuilder().setLabel("1").setValue("1"),
      new StringSelectMenuOptionBuilder().setLabel("5").setValue("5"),
      new StringSelectMenuOptionBuilder().setLabel("10").setValue("10"),
      new StringSelectMenuOptionBuilder().setLabel("20").setValue("20"),
    ])
);
