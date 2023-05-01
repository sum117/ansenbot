import PocketBase from "../lib/pocketbase/PocketBase";
import { Character, Faction, Race, Spec } from "../types/Character";

/**
 * This function returns the url of the image of a ansenfall entry. In other words it assumes all records it receives will own an "image" property.
 * @param entity
 * @param thumb
 */
export default function getPocketbaseImageUrl(
  entity: Faction | Character | Race | Spec,
  thumb: boolean = false
) {
  return PocketBase.getImageUrl({
    record: entity,
    fileName: entity.image,
    thumb,
  })
    .replace(process.env.POCKETBASE_URL + "api/files", "")
    .replace(/\?.*/, "");
}
