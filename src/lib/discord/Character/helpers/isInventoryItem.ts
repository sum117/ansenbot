import { InventoryItem } from "../../../../types/Character";

export default function isInventoryItem(item: unknown): item is InventoryItem {
  return typeof item === "object" && item !== null && "expand" in item && "amount" in item;
}
