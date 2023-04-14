import type { RecordListQueryParams } from "pocketbase";

import type { COLLECTIONS } from "../data/constants";
import type { RelationFields } from "./Character";
import { baseSchema } from "../schemas/characterSchema";
import z from "zod";

export type PocketBaseConstants = z.infer<typeof baseSchema>;

export type GetEntityParams = {
  entityType: keyof typeof COLLECTIONS;
  expandFields?: boolean;
  id: string;
};
export type CreateData<T> = Omit<T, keyof PocketBaseConstants | "expand">;

export type CreateEntityParams<T extends RelationFields> = {
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
  page?: number;
};
