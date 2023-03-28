import PB, {
  ListResult,
  RecordListQueryParams,
  type Record as DBRecord,
} from "pocketbase";
import type {
  AllowedEntityTypes,
  Character,
  CreateData,
  RelationFields,
} from "../../types";
import {
  CreateEntityParams,
  DeleteEntityParams,
  GetAllEntitiesParams,
  GetEntitiesByFilterParams,
  GetEntityParams,
  UpdateEntityParams,
} from "../../types/PocketBaseCRUD";

import { COLLECTIONS, RELATION_FIELD_NAMES } from "./constants";

const pb = new PB(process.env.POCKETBASE_URL);
await pb.admins.authWithPassword(
  process.env.POCKETBASE_ADMIN_EMAIL ??
    (console.log("No admin email provided"), process.exit(1)),
  process.env.POCKETBASE_ADMIN_PASSWORD ??
    (console.log("No admin password provided"), process.exit(1))
);

export class PocketBase {
  public static expand(
    ...relations: (typeof RELATION_FIELD_NAMES)[keyof typeof RELATION_FIELD_NAMES][]
  ): Record<string, string> {
    return {
      expand: relations.join(","),
    };
  }

  public static async getImageUrl({
    record,
    fileName,
    thumb,
  }: {
    fileName: string;
    record: Pick<DBRecord, "id" | "collectionId" | "collectionName">;
    thumb?: boolean;
  }): Promise<string | Buffer> {
    const url = pb.getFileUrl(record, fileName, {
      thumb: thumb ? "512x512" : undefined,
    });
    if (url.startsWith("http://localhost")) {
      const response = await fetch(url);
      const buffer = Buffer.from(await response.arrayBuffer());
      return buffer;
    }
    return url;
  }

  public static async validateRecord<
    T extends Pick<DBRecord, "id" | "created" | "updated">
  >(object: T, fetcher: (id: string) => Promise<T>): Promise<T> {
    const prevData = await fetcher(object.id);

    if (
      prevData.created !== object.created ||
      prevData.updated !== object.updated
    ) {
      throw new Error("Invalid update");
    }

    return prevData;
  }

  public static async getEntityById<T extends AllowedEntityTypes>({
    entityType,
    id,
    expandFields = false,
  }: GetEntityParams): Promise<T> {
    const response = await pb
      .collection(COLLECTIONS[entityType])
      .getOne<T>(
        id,
        expandFields
          ? PocketBase.expand(...Object.values(RELATION_FIELD_NAMES))
          : undefined
      );

    return response;
  }

  public static async createEntity<T extends AllowedEntityTypes>({
    entityType,
    entityData,
    expandFields,
  }: CreateEntityParams<T>): Promise<T> {
    const response = await pb
      .collection(COLLECTIONS[entityType])
      .create<T>(
        entityData,
        expandFields
          ? PocketBase.expand(...Object.values(RELATION_FIELD_NAMES))
          : undefined
      );
    return response;
  }

  public static async getAllEntities<T extends AllowedEntityTypes>({
    entityType,
  }: GetAllEntitiesParams): Promise<T[]> {
    const response = await pb
      .collection(COLLECTIONS[entityType])
      .getFullList<T>();

    return response;
  }

  public static async getEntitiesByFilter<T extends AllowedEntityTypes>({
    entityType,
    filter,
  }: GetEntitiesByFilterParams): Promise<ListResult<T>> {
    const response = await pb
      .collection(COLLECTIONS[entityType])
      .getList<T>(...filter);

    return response;
  }

  public static async updateEntity<T extends AllowedEntityTypes>({
    entityType,
    entityData,
  }: UpdateEntityParams<T>): Promise<T> {
    const {
      id,
      collectionId: _collectionId,
      collectionName: _collectionName,
      updated: _updated,
      created: _created,
      ...body
    } = entityData;

    return pb.collection(COLLECTIONS[entityType]).update<T>(id, body);
  }

  public static async deleteEntity({
    entityType,
    id,
  }: DeleteEntityParams): Promise<boolean> {
    return pb.collection(COLLECTIONS[entityType]).delete(id);
  }
}
