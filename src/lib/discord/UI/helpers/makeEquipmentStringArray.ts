import { equipmentDictionary } from "../../../../data/translations";
import isInventoryItem from "../../Character/helpers/isInventoryItem";
import { CharacterBody } from "../../../../types/Character";

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
  ];

  const descriptionsPromises = orderedKeys.map(async (key) => {
    const itemSlot = equipmentDictionary[key];
    const equipment = body.expand?.[key];

    return isInventoryItem(equipment)
      ? `**${itemSlot}**: ${equipment.expand.item.name}`
      : `**${itemSlot}**: Nada Equipado`;
  });

  const descriptions = await Promise.all(descriptionsPromises);
  return descriptions;
}
