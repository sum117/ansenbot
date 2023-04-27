import { Item } from "../../../../types/Item";

export default function isInventoryItem(item: unknown): item is Item {
  return typeof item === "object" && item !== null && "expand" in item && "quantity" in item;
}
