import { equipmentDictionary } from "../../../../data/translations";
import type { CharacterBody } from "../../../../types/Character";
import type { EquipmentItem, SpellItem } from "../../../../types/Item";
import isInventoryItem from "../../Character/helpers/isInventoryItem";

export default async function makeEquipmentStringArray(
  body: CharacterBody
): Promise<Array<string>> {
  const orderedKeys: (keyof typeof equipmentDictionary)[] = [
    "head",
    "face",
    "amulet",
    "shoulders",
    "chest",
    "back",
    "leftArm",
    "rightArm",
    "legs",
    "feet",
    "rings",
    "spells",
  ];

  const descriptionsPromises = orderedKeys.map((key) => {
    const itemSlot = equipmentDictionary[key];
    const isRingOrSpell = (equipment: unknown): equipment is EquipmentItem[] | SpellItem[] =>
      Array.isArray(equipment) && equipment.every(isInventoryItem);

    const equipment = body.expand?.[key];
    if (equipment) {
      const name = isRingOrSpell(equipment)
        ? equipment.map((item) => item.expand.item.name).join(", ")
        : equipment.expand.item.name;
      return `**${itemSlot}**: ${name}`;
    } else {
      return `**${itemSlot}**: Nada Equipado`;
    }
  });

  const descriptions = await Promise.all(descriptionsPromises);
  return descriptions;
}
