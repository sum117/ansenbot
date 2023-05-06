import PocketBase from "../lib/pocketbase/PocketBase";
import type { Character, Faction, Race, Spec } from "../types/Character";

/**
 * This function returns the url of the image of a ansenfall entry. In other words it assumes all records it receives will own an "image" property.
 * @param entity
 * @param thumb
 */
export default function getPocketbaseImageUrl(
  entity: Faction | Character | Race | Spec,
  thumb = false
): string {
  return PocketBase.getImageUrl({
    record: entity,
    fileName: entity.image,
    thumb,
  })
    .replace(process.env.POCKETBASE_URL + "api/files", "")
    .replace(/\?.*/, "");
}
