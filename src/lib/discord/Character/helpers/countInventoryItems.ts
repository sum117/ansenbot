import { InventoryItem } from "../../../../types/Character";

export default function countInventoryItemsReducer(
  acc: {
    consumable: number;
    equipment: number;
    spell: number;
  },
  inventoryRef: InventoryItem
) {
  if (inventoryRef.expand?.item.type === "weapon" || inventoryRef.expand?.item.type === "armor") {
    acc.equipment += 1;
  } else {
    acc[inventoryRef.expand?.item.type as "consumable" | "spell"] += 1;
  }
  return acc;
}
