import type { RecordListQueryParams } from "pocketbase";
import type { AllowedEntityTypes, CreateData } from ".";
import type { COLLECTIONS } from "../lib/pocketbase/constants";

export type GetEntityParams = {
  entityType: keyof typeof COLLECTIONS;
  id: string;
  expandFields?: boolean;
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
  entityType: keyof typeof COLLECTIONS;
  entityData: T;
};

export type DeleteEntityParams = {
  entityType: keyof typeof COLLECTIONS;
  id: string;
};

export type GetAllEntitiesParams = {
  entityType: keyof typeof COLLECTIONS;
};
