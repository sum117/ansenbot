import type { CreateData } from "../../types/PocketBaseCRUD";
import type { Reign } from "../../types/Reign";
import getImageBlob from "../../utils/getImageBlob";
import jsonToFormData from "../../utils/jsonToFormData";
import PocketBase from "./PocketBase";

export default class ReignFetcher {
  public static async createReign(reign: CreateData<Reign>): Promise<Reign> {
    const { blob, fileName } = await getImageBlob(reign.image);

    const formData = jsonToFormData(reign);
    formData.delete("image");
    formData.append("image", blob, fileName);

    return PocketBase.createEntityWithFormData<Reign>("reigns", formData);
  }

  public static updateReign(reign: Reign): Promise<Reign> {
    return PocketBase.updateEntity<Reign>({
      entityType: "reigns",
      entityData: reign,
    });
  }

  public static async getReignByOwnerId(ownerId: string): Promise<Reign | null> {
    try {
      const reign = await PocketBase.getFirstListEntity<Reign>({
        entityType: "reigns",
        filter: [`owner="${ownerId}"`, {}],
      });
      return reign;
    } catch {
      return null;
    }
  }

  public static async getReignByCharacterId(characterId: string): Promise<Reign | null> {
    try {
      const reign = await PocketBase.getFirstListEntity<Reign>({
        entityType: "reigns",
        filter: [`characters~"${characterId}"`, {}],
      });
      return reign;
    } catch {
      return null;
    }
  }
}
