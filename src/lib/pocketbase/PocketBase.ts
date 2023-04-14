import PB, { type Record as DBRecord } from "pocketbase";

import type { RELATION_FIELD_NAMES } from "../../data/constants";

const pb = new PB(process.env.POCKETBASE_URL);
await pb.admins.authWithPassword(
  process.env.POCKETBASE_ADMIN_EMAIL ?? (console.error("No admin email provided"), process.exit(1)),
  process.env.POCKETBASE_ADMIN_PASSWORD ??
    (console.error("No admin password provided"), process.exit(1))
);

export default class PocketBase {
  protected readonly pb: PB;
  public constructor() {
    this.pb = pb;
  }

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

  public static async validateRecord<T extends Pick<DBRecord, "id" | "created" | "updated">>(
    object: T,
    fetcher: (id: string) => Promise<T>
  ): Promise<T> {
    const prevData = await fetcher(object.id);

    if (prevData.created !== object.created || prevData.updated !== object.updated) {
      throw new Error("Invalid update");
    }

    return prevData;
  }
}
