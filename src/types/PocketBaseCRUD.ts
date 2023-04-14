import type { RecordListQueryParams } from "pocketbase";

import type { COLLECTIONS } from "../data/constants";
import type { CreateData, RelationFields } from "./Character";

export type GetEntityParams = {
  entityType: keyof typeof COLLECTIONS;
  expandFields?: boolean;
  id: string;
};

export type CreateEntityParams<T extends RelationFields> = {
  entityData: CreateData<T>;
  entityType: keyof typeof COLLECTIONS;
  expandFields?: boolean;
};

export type GetEntitiesByFilterParams = {
  entityType: keyof typeof COLLECTIONS;
  filter: [number, number, RecordListQueryParams];
};

export type UpdateEntityParams<T extends RelationFields> = {
  entityData: T;
  entityType: keyof typeof COLLECTIONS;
};

export type DeleteEntityParams = {
  entityType: keyof typeof COLLECTIONS;
  id: string;
};

export type GetAllEntitiesParams = {
  entityType: keyof typeof COLLECTIONS;
};
export type PocketBaseConstants = "collectionId" | "collectionName" | "created" | "id" | "updated";
