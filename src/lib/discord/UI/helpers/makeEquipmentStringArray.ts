import { equipmentDictionary } from "../../../../data/translations";
import isInventoryItem from "../../Character/helpers/isInventoryItem";
import { CharacterBody } from "../../../../types/Character";
import { EquipmentItem, SpellItem } from "../../../../types/Item";

export default async function makeEquipmentStringArray(body: CharacterBody) {
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

  const descriptionsPromises = orderedKeys.map(async (key) => {
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
