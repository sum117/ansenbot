import type { Skills } from "../../types/Character";
import PocketBase from "./PocketBase";

export class SkillsFetcher {
  public static async getSkillsById(skillRelationId: string): Promise<Skills> {
    return PocketBase.getEntityById<Skills>({ entityType: "skills", id: skillRelationId });
  }
}
