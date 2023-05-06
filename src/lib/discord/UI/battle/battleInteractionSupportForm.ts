import { Character } from "../../../../types/Character";
import getInteractionMetadata from "../helpers/getInteractionMetadata";
import MultiForm from "../classes/MultiForm";
import {
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";

export default async function battleInteractionSupportForm(helper: Character, target: Character) {
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
        .setCustomId(`battle:support:spell:${helper.playerId}:${target.playerId}`)
        .setOptions(spellsOptions)
    );
  }

  fields.push(
    new ButtonBuilder()
      .setCustomId(`battle:support:sacrifice:${helper.playerId}:${target.playerId}`)
      .setLabel("Sacrificar")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("🔥")
  );

  fields.push(
    new ButtonBuilder()
      .setCustomId(`battle:support:pass:${helper.playerId}:${target.playerId}`)
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
