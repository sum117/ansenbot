import {
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";

import { equipmentDictionary } from "../../../../data/translations";
import type { Character } from "../../../../types/Character";
import getSafeEntries from "../../../../utils/getSafeEntries";
import MultiForm from "../classes/MultiForm";
import getInteractionMetadata from "../helpers/getInteractionMetadata";

export default async function battleInteractionAttackForm(
  agent: Character,
  target: Character
): Promise<MultiForm> {
  const { render, imageUrl, infoFields } = await getInteractionMetadata(agent, target);

  const blackListKeys: Array<keyof typeof equipmentDictionary> = ["amulet", "rings", "spells"];

  const bodyPartsOptions = getSafeEntries(equipmentDictionary)
    .map(([key, value]) => {
      if (blackListKeys.includes(key)) {
        return null;
      }
      return new StringSelectMenuOptionBuilder().setLabel(value).setValue(key);
    })
    .filter((option): option is StringSelectMenuOptionBuilder => option !== null);

  const spellsOptions = agent.expand.body.expand?.spells?.map((spell) => {
    return new StringSelectMenuOptionBuilder().setLabel(spell.expand.item.name).setValue(spell.id);
  });

  const fields: Array<StringSelectMenuBuilder | ButtonBuilder> = [];
  fields.push(
    new StringSelectMenuBuilder()
      .setPlaceholder("Selecione onde atacar...")
      .setCustomId(`battle:attack:body:${agent.playerId}:${target.playerId}`)
      .setOptions(bodyPartsOptions)
  );
  if (spellsOptions) {
    fields.push(
      new StringSelectMenuBuilder()
        .setPlaceholder("Feitiço (Opcional)")
        .setCustomId(`battle:attack:spell:${agent.playerId}:${target.playerId}`)
        .setOptions(spellsOptions)
    );
  }

  fields.push(
    new ButtonBuilder()
      .setCustomId(`battle:attack:commit:${agent.playerId}:${target.playerId}`)
      .setLabel("Confirmar Ataque")
      .setStyle(ButtonStyle.Success)
      .setEmoji("✅")
  );
  fields.push(
    new ButtonBuilder()
      .setCustomId(`battle:attack:flee:${agent.playerId}:${target.playerId}`)
      .setLabel("Tentar Fugir")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("🏃‍♂️")
  );
  fields.push(
    new ButtonBuilder()
      .setCustomId(`battle:attack:pass:${agent.playerId}:${target.playerId}`)
      .setLabel("Passar Turno")
      .setEmoji("⏭️")
      .setStyle(ButtonStyle.Primary)
  );

  const form = new MultiForm({
    description: render("{{{agent}}} está atacando {{{target}}}..."),
    title: render("Ataque de {{{agent}}}"),
    imageUrl,
    fields,
  });

  form.addEmbedFields(infoFields);

  return form;
}
