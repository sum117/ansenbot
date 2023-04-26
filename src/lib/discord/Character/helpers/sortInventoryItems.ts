import { InventoryItem } from "../../../../types/Character";

export default function sortInventoryItems(a: InventoryItem, b: InventoryItem) {
  const itemOrder = {
    weapon: 1,
    armor: 2,
    consumable: 3,
    spell: 4,
  };

  type ItemOrder = keyof typeof itemOrder;
  const aType = a.expand?.item?.type as ItemOrder | undefined;
  const bType = b.expand?.item?.type as ItemOrder | undefined;

  if (!aType || !bType) {
    return 0;
  }

  const aTypeOrder = itemOrder[aType] || 0;
  const bTypeOrder = itemOrder[bType] || 0;

  if (aTypeOrder === bTypeOrder) {
    return 0;
  }

  return aTypeOrder - bTypeOrder;
}
