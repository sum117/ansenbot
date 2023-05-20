import type { Snowflake } from "discord.js";
import { ButtonBuilder, ButtonStyle } from "discord.js";

import type { GachaItemBuilderResponse } from "../../../../types/Item";
import getRoleplayDataFromUserId from "../../Character/helpers/getRoleplayDataFromUserId";
import MultiForm from "../classes/MultiForm";
import getCharacterMustache from "../helpers/characterMustache";
import getGachaId from "../helpers/getGachaId";
import { getRequirementsInfoFields } from "../helpers/getRequirementsInfoFields";

export const gachaItemsMessageOptions = async (
  userId: Snowflake,
  record: GachaItemBuilderResponse
): Promise<MultiForm> => {
  const fields: ButtonBuilder[] = [];
  const { character } = await getRoleplayDataFromUserId(userId);
  const characterMustache = getCharacterMustache(character);
  fields.push(
    new ButtonBuilder()
      .setCustomId(getGachaId("reroll"))
      .setLabel("Rolar Novamente")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("♻️")
  );

  fields.push(
    new ButtonBuilder()
      .setCustomId(getGachaId("keep"))
      .setLabel("Manter")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("🫶")
  );

  const form = new MultiForm({
    title: characterMustache("Canalizador de Itens Espiritual"),
    description: characterMustache(
      '"A sorte não é nada sem sabedoria e coragem, {{{character.name}}}."'
    ),
    fields: fields,
  });

  form.setEmbedThumbnail(record.rarityImage);

  form.addEmbedFields(
    getRequirementsInfoFields({
      requirements: record.requirements,
      multiplier: record.item.multiplier,
      quotient: record.item.quotient,
      slot: record.item.slot,
      type: record.item.type,
      rarity: record.item.rarity ?? "n",
    })
  );

  return form;
};
