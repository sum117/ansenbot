import type { RecordListQueryParams } from "pocketbase";

import type { COLLECTIONS } from "../lib/pocketbase/constants";
import type { AllowedEntityTypes, CreateData } from ".";

export type GetEntityParams = {
  entityType: keyof typeof COLLECTIONS;
  expandFields?: boolean;
  id: string;
};

export type CreateEntityParams<T extends AllowedEntityTypes> = {
  entityData: CreateData<T>;
  entityType: keyof typeof COLLECTIONS;
  expandFields?: boolean;
};

export type GetEntitiesByFilterParams = {
  entityType: keyof typeof COLLECTIONS;
  filter: [number, number, RecordListQueryParams];
};

export type UpdateEntityParams<T extends AllowedEntityTypes> = {
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
