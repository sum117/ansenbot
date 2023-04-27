import { equipmentSchema } from "../../../../schemas/characterSchema";
import { ITEM_TYPES_EMOJIS } from "../../../../data/constants";
import { ConsumableItem, EquipmentItem, SpellItem } from "../../../../types/Item";

export default function makeInventoryStringArray(
  itemsArray: Array<ConsumableItem | EquipmentItem | SpellItem>,
  id?: string
) {
  if (!itemsArray.length) {
    return ["Você não possui nenhum item."];
  }

  let itemToHighlight = itemsArray.find((item) => item.id === id);
  const inventoryStringArray = itemsArray.map((data) => {
    const equipment = equipmentSchema.safeParse(data);
    const itemString: string[] = [];
    itemString.push(`${ITEM_TYPES_EMOJIS[data.expand.item.type]}`);
    itemString.push(`**${data.expand.item.name}**`);
    itemString.push(`${data.quantity}x`);
    if (equipment.success && equipment.data.isEquipped) {
      itemString.push("(Equipado)");
    }
    if (itemToHighlight && itemToHighlight.id === data.id) {
      itemString.push("🔹");
    }

    return itemString.join(" ");
  });

  return inventoryStringArray;
}
