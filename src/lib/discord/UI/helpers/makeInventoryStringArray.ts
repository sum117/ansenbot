import { Inventory } from "../../../../types/Character";
import { itemTypesEmojis } from "../../../../data/translations";

export default function makeInventoryStringArray(inventory: Inventory) {
  const inventoryArray = [
    ...(inventory.expand.consumables ?? []),
    ...(inventory.expand.equipments ?? []),
    ...(inventory.expand.spells ?? []),
  ];

  const inventoryStringArray = inventoryArray.map((data) => {
    const itemString = `${itemTypesEmojis[data.expand.item.type]} **${data.expand.item.name}** ${
      data.quantity
    }x`;
    return itemString;
  });

  return inventoryStringArray;
}
