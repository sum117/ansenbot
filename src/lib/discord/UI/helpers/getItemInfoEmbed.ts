import { ItemWithRole } from "../../../../types/Item";
import { EmbedBuilder } from "discord.js";
import { equipmentDictionary, itemTypesDictionary } from "../../../../data/translations";
import { STATUS_NAMES } from "../../../../data/constants";
import {
  consumableSchema,
  equipmentSchema,
  spellSchema,
} from "../../../../schemas/characterSchema";
import removePocketbaseConstants from "../../../../utils/removePocketbaseConstants";
import getSafeEntries from "../../../../utils/getSafeEntries";

export default function getItemInfoEmbed(item: ItemWithRole, ownerName?: string): EmbedBuilder {
  const fields: Array<{ name: string; value: string; inline: boolean }> = [];
  fields.push({ name: "Tipo", value: itemTypesDictionary[item.type], inline: true });
  if (ownerName) {
    fields.push({ name: "Dono(a)", value: ownerName, inline: true });
  }

  if (item.expand) {
    const expanded =
      item.expand["consumables(item)"] ??
      item.expand["equipments(item)"] ??
      item.expand["spells(item)"];

    const fieldInfo: Array<string> = [];
    const keysBlacklist = ["item", "expand", "isCooked", "isPoisoned", "quantity", "isEquipped"];
    const isBlacklisted = (key: string): key is (typeof keysBlacklist)[number] =>
      keysBlacklist.includes(key);

    switch (item.type) {
      case "consumable": {
        const consumable = consumableSchema
          .omit({
            expand: true,
          })
          .parse(expanded[0]);
        for (const [key, value] of getSafeEntries(removePocketbaseConstants(consumable))) {
          if (isBlacklisted(key)) {
            continue;
          }
          fieldInfo.push(`${STATUS_NAMES[key]}: ${value}`);
        }
        fields.push({ name: "Informações", value: fieldInfo.join("\n"), inline: true });
        fields.push({ name: "Quantidade", value: consumable.quantity.toString(), inline: true });
        fields.push({ name: "Cozido", value: consumable.isCooked ? "Sim" : "Não", inline: true });

        break;
      }

      case "equipment": {
        const equipment = equipmentSchema.omit({ expand: true }).parse(expanded[0]);
        fields.push({ name: "Slot", value: equipmentDictionary[equipment.slot], inline: true });
        fields.push({
          name: "Equipado",
          value: equipment.isEquipped ? "Sim" : "Não",
          inline: true,
        });
        fields.push({ name: "Quantidade", value: equipment.quantity.toString(), inline: true });

        break;
      }

      case "spell": {
        const spell = spellSchema.omit({ expand: true }).parse(expanded[0]);
        fields.push({ name: "Quantidade", value: spell.quantity.toString(), inline: true });
        fields.push({ name: "Equipado", value: spell.isEquipped ? "Sim" : "Não", inline: true });

        break;
      }
    }
  }
  return new EmbedBuilder()
    .setTitle(item.name)
    .setDescription(item.description)
    .setFields(fields)
    .setColor("Random")
    .setTimestamp(Date.now());
}
