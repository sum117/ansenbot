import type { RecordListQueryParams } from "pocketbase";
import type z from "zod";

import type { COLLECTIONS } from "../data/constants";
import baseSchema from "../schemas/baseSchema";
import type { Collection } from "./Collection";

export const pocketbaseConstants = baseSchema.keyof().Enum;
export type PocketBaseConstants = z.infer<typeof baseSchema>;

export type GetEntityParams = {
  entityType: keyof typeof COLLECTIONS;
  expandFields?: boolean;
  id: string;
};
export type CreateData<T> = Omit<T, keyof PocketBaseConstants | "expand">;

export type CreateEntityParams<T extends Collection> = {
  entityData: CreateData<T>;
  entityType: keyof typeof COLLECTIONS;
  expandFields?: boolean;
};

export type GetEntitiesByFilterParams = {
  entityType: keyof typeof COLLECTIONS;
  filter: [number, number, RecordListQueryParams];
};

export type GetFirstEntityByFilterParams = {
  entityType: keyof typeof COLLECTIONS;
  filter: [string, RecordListQueryParams];
};

export type UpdateEntityParams<T extends Collection> = {
  entityData: T;
  entityType: keyof typeof COLLECTIONS;
};

interface BaseDeleteEntityParams {
  entityType: keyof typeof COLLECTIONS;
}

type DeleteEntityParamsWithId = BaseDeleteEntityParams & {
  id: string;
};

type DeleteEntityParamsWithFilter = BaseDeleteEntityParams & {
  filter: [string, RecordListQueryParams];
};

export type DeleteEntityParams = DeleteEntityParamsWithId | DeleteEntityParamsWithFilter;

export type GetAllEntitiesParams = {
  entityType: keyof typeof COLLECTIONS;
  page?: number;
  quantity?: number;
  expandFields?: Array<string>;
};
