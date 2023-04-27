import { equipmentDictionary } from "../../../../data/translations";
import isInventoryItem from "../../Character/helpers/isInventoryItem";
import { ItemFetcher } from "../../../pocketbase/ItemFetcher";
import { CharacterBody } from "../../../../types/Character";

export default async function makeEquipmentStringArray(equipment: CharacterBody) {
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
    const inventoryRef = equipment.expand?.[key];

    return isInventoryItem(inventoryRef)
      ? `**${itemSlot}**: ${(await ItemFetcher.getItemById(inventoryRef.item)).name}`
      : `**${itemSlot}**: Nada Equipado`;
  });

  const descriptions = await Promise.all(descriptionsPromises);
  return descriptions;
}
