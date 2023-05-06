import type { PocketBaseConstants } from "../types/PocketBaseCRUD";

export default function removePocketbaseConstants<T extends Partial<PocketBaseConstants>>(
  obj: T
): Omit<T, keyof PocketBaseConstants> {
  const newObj = { ...obj };
  delete newObj.id;
  delete newObj.created;
  delete newObj.updated;
  delete newObj.collectionName;
  delete newObj.collectionId;
  return newObj;
}
