import {
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";

import type { Character } from "../../../../types/Character";
import MultiForm from "../classes/MultiForm";
import getInteractionMetadata from "../helpers/getInteractionMetadata";

export default async function battleInteractionHelpForm(helper: Character, target: Character) {
  const { render, imageUrl, infoFields } = await getInteractionMetadata(helper, target);
  const fields: Array<StringSelectMenuBuilder | ButtonBuilder> = [];

  const spellsOptions = helper.expand.body.expand?.spells
    ?.filter((spell) => spell.isBuff)
    .map((spell) => {
      return new StringSelectMenuOptionBuilder()
        .setLabel(spell.expand.item.name)
        .setValue(spell.id);
    });
  if (spellsOptions?.length) {
    fields.push(
      new StringSelectMenuBuilder()
        .setPlaceholder("Feitiço (Opcional)")
        .setCustomId(`battle:help:spell:${helper.playerId}:${target.playerId}`)
        .setOptions(spellsOptions)
    );
  }

  fields.push(
    new ButtonBuilder()
      .setCustomId(`battle:help:sacrifice:${helper.playerId}:${target.playerId}`)
      .setLabel("Sacrificar")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("🔥")
  );

  fields.push(
    new ButtonBuilder()
      .setCustomId(`battle:help:pass:${helper.playerId}:${target.playerId}`)
      .setLabel("Passar Turno")
      .setEmoji("⏭️")
      .setStyle(ButtonStyle.Primary)
  );

  const form = new MultiForm({
    imageUrl,
    title: render("Ajudar {{{target}}}"),
    description: render(
      "⚠️ Sacrificar dá 1/3 do seu HP para {{{target}}}. Use com cuidado. Se você ainda possuir MP, você pode usar um feitiço de cura. É mais recomendado."
    ),
    fields,
  });

  form.addEmbedFields(infoFields);
  return form;
}
