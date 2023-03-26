import PB, { type Record as DBRecord } from "pocketbase";

import type { COLLECTIONS } from "./constants";

const pb = new PB(process.env.POCKETBASE_URL);
await pb.admins.authWithPassword(
  process.env.POCKETBASE_ADMIN_EMAIL ??
    (console.log("No admin email provided"), process.exit(1)),
  process.env.POCKETBASE_ADMIN_PASSWORD ??
    (console.log("No admin password provided"), process.exit(1))
);

export class PocketBase {
  protected readonly pb: PB;
  public constructor() {
    this.pb = pb;
  }

  public static expand(
    ...relations: (typeof COLLECTIONS)[keyof typeof COLLECTIONS][]
  ): Record<string, string> {
    return {
      expand: relations.join(","),
    };
  }

  public static getImage<
    T extends Pick<DBRecord, "id" | "collectionId"> & { image: string }
  >({ id, collectionId, image }: T): string {
    return `${process.env.POCKETBASE_URL}/api/files/${collectionId}/${id}/${image}`;
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
}
