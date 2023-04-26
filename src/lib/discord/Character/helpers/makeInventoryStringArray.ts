import { itemTypesEmojis } from "../../../../data/translations";
import { InventoryItem } from "../../../../types/Character";

export default function makeInventoryStringArray(inventoryRef: InventoryItem) {
  const item = inventoryRef.expand?.item;
  if (!item) {
    return;
  }
  const typeEmoji = itemTypesEmojis[item.type as keyof typeof itemTypesEmojis];
  return `${typeEmoji} **${item.name}** ${inventoryRef.amount}x`;
}
