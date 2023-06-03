import { EmbedBuilder } from "discord.js";
import { inspect } from "util";

import { STATUS_NAMES } from "../../../../data/constants";
import { itemTypesDictionary } from "../../../../data/translations";
import {
  consumableSchema,
  equipmentSchema,
  spellSchema,
} from "../../../../schemas/characterSchema";
import type { EquipmentItem, ItemWithRole, SpellItem } from "../../../../types/Item";
import type { CreateData } from "../../../../types/PocketBaseCRUD";
import getSafeEntries from "../../../../utils/getSafeEntries";
import removePocketbaseConstants from "../../../../utils/removePocketbaseConstants";
import type { CharacterManager } from "../../Character/classes/CharacterManager";
import { getRequirementsInfoFields } from "./getRequirementsInfoFields";

export default function getItemInfoEmbed(
  item: ItemWithRole,
  characterManager: CharacterManager
): EmbedBuilder {
  let fields: Array<{ name: string; value: string; inline: boolean }> = [];
  fields.push({ name: "Tipo", value: itemTypesDictionary[item.type], inline: true });
  fields.push({ name: "Dono(a)", value: characterManager.character.name, inline: true });

  if (item.expand) {
    const expanded =
      item.expand["consumables(item)"] ??
      item.expand["equipments(item)"] ??
      item.expand["spells(item)"];
    const charInventory = characterManager.getInventory();
    const itemsList = [
      ...charInventory.consumables,
      ...charInventory.equipments,
      ...charInventory.spells,
    ];
    const filteredExpanded = expanded.find((item) => itemsList.includes(item.id));
    const fieldInfo: Array<string> = [];
    const keysBlacklist = ["item", "expand", "quantity", "isEquipped", "type"];
    const isBlacklisted = (key: string): key is (typeof keysBlacklist)[number] =>
      keysBlacklist.includes(key);

    const getRequirementFieldsProps = (item: CreateData<EquipmentItem | SpellItem>) => ({
      requirements: {
        strength: item.strength,
        dexterity: item.dexterity,
        intelligence: item.intelligence,
        darkness: item.darkness,
        discovery: item.discovery,
        fortitude: item.fortitude,
        order: item.order,
        stealth: item.stealth,
        vigor: item.vigor,
        charisma: item.charisma,
      },
      multiplier: item.multiplier,
      quotient: item.quotient,
      slot: item.slot,
      type: item.type,
      rarity: item.rarity ? item.rarity : "n",
    });

    switch (item.type) {
      case "consumable": {
        const consumable = consumableSchema
          .omit({
            expand: true,
          })
          .parse(filteredExpanded);
        for (const [key, value] of getSafeEntries(removePocketbaseConstants(consumable))) {
          if (isBlacklisted(key)) {
            continue;
          }
          fieldInfo.push(`${STATUS_NAMES[key]}: ${value}`);
        }
        fields.push({ name: "Informações", value: fieldInfo.join("\n"), inline: true });
        fields.push({ name: "Quantidade", value: consumable.quantity.toString(), inline: true });

        break;
      }

      case "equipment": {
        const equipment = equipmentSchema.omit({ expand: true }).parse(expanded[0]);
        fields.push({
          name: "Equipado",
          value: equipment.isEquipped ? "Sim" : "Não",
          inline: true,
        });
        fields.push({ name: "Quantidade", value: equipment.quantity.toString(), inline: true });
        fields = fields.concat(getRequirementsInfoFields(getRequirementFieldsProps(equipment)));

        break;
      }

      case "spell": {
        const spell = spellSchema.omit({ expand: true }).parse(expanded[0]);
        fields.push({ name: "Quantidade", value: spell.quantity.toString(), inline: true });
        fields.push({ name: "Equipado", value: spell.isEquipped ? "Sim" : "Não", inline: true });
        fields = fields.concat(getRequirementsInfoFields(getRequirementFieldsProps(spell)));
        break;
      }
    }
  }
  console.log(inspect(fields, false, 10, true));
  return new EmbedBuilder()
    .setTitle(item.name)
    .setDescription(item.description)
    .setFields(fields)
    .setColor("Random")
    .setTimestamp(Date.now());
}
