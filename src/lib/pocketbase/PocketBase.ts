import PB, { type ListResult, type Record as DBRecord } from "pocketbase";

import { COLLECTIONS, RELATION_FIELD_NAMES } from "../../data/constants";
import type { Collection } from "../../types/Collection";
import type {
  CreateEntityParams,
  DeleteEntityParams,
  GetAllEntitiesParams,
  GetEntitiesByFilterParams,
  GetEntityParams,
  GetFirstEntityByFilterParams,
  UpdateEntityParams,
} from "../../types/PocketBaseCRUD";
import { BotError } from "../../utils/Errors";

const pb = new PB(process.env.POCKETBASE_URL);
await pb.admins.authWithPassword(
  process.env.POCKETBASE_ADMIN_EMAIL ?? (console.error("No admin email provided"), process.exit(1)),
  process.env.POCKETBASE_ADMIN_PASSWORD ??
    (console.error("No admin password provided"), process.exit(1))
);

export default class PocketBase {
  public static expand(
    ...relations: (typeof RELATION_FIELD_NAMES)[keyof typeof RELATION_FIELD_NAMES][]
  ): Record<string, string> {
    return {
      expand: relations.join(","),
    };
  }

  public static getImageUrl({
    record,
    fileName,
    thumb,
  }: {
    fileName: string;
    record: Pick<DBRecord, "id" | "collectionId" | "collectionName">;
    thumb?: boolean;
  }): string {
    return pb.getFileUrl(record, fileName, {
      thumb: thumb ? "512x512" : undefined,
    });
  }

  public static async validateRecord<T extends Pick<DBRecord, "id" | "created" | "updated">>(
    object: T,
    fetcher: (id: string) => Promise<T>
  ): Promise<T> {
    const prevData = await fetcher(object.id);

    if (prevData.created !== object.created || prevData.updated !== object.updated) {
      throw new BotError("Invalid update");
    }

    return prevData;
  }

  public static getEntityById<T extends Collection>({
    entityType,
    id,
    expandFields = true,
  }: GetEntityParams): Promise<T> {
    return pb
      .collection(COLLECTIONS[entityType])
      .getOne<T>(
        id,
        expandFields ? PocketBase.expand(...Object.values(RELATION_FIELD_NAMES)) : undefined
      );
  }

  public static createEntity<T extends Collection>({
    entityType,
    entityData,
    expandFields = true,
  }: CreateEntityParams<T>): Promise<T> {
    return pb
      .collection(COLLECTIONS[entityType])
      .create<T>(
        entityData,
        expandFields ? PocketBase.expand(...Object.values(RELATION_FIELD_NAMES)) : undefined
      );
  }

  public static getAllEntities<T extends Collection>({
    entityType,
    page = 1,
  }: GetAllEntitiesParams): Promise<ListResult<T>> {
    return pb.collection(COLLECTIONS[entityType]).getList<T>(page, 24);
  }

  public static getFirstListEntity<T extends Collection>({
    entityType,
    filter,
  }: GetFirstEntityByFilterParams): Promise<T> {
    return pb.collection(COLLECTIONS[entityType]).getFirstListItem<T>(...filter);
  }

  public static getEntitiesByFilter<T extends Collection>({
    entityType,
    filter,
  }: GetEntitiesByFilterParams): Promise<ListResult<T>> {
    return pb.collection(COLLECTIONS[entityType]).getList<T>(...filter);
  }

  public static updateEntityWithFormData(
    entityId: string,
    entityType: keyof typeof COLLECTIONS,
    formData: FormData
  ): Promise<DBRecord> {
    return pb.collection(COLLECTIONS[entityType]).update(entityId, formData);
  }

  public static createEntityWithFormData<T extends Collection>(
    entityType: keyof typeof COLLECTIONS,
    formData: FormData
  ): Promise<T> {
    return pb
      .collection(COLLECTIONS[entityType])
      .create<T>(formData, PocketBase.expand(...Object.values(RELATION_FIELD_NAMES)));
  }

  public static updateEntity<T extends Collection>({
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

  public static deleteEntity({ entityType, id }: DeleteEntityParams): Promise<boolean> {
    return pb.collection(COLLECTIONS[entityType]).delete(id);
  }
}
