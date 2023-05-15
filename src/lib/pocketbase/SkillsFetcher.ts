import type { Skills } from "../../types/Character";
import PocketBase from "./PocketBase";

export class SkillsFetcher {
  public static getSkillsById(skillRelationId: string): Promise<Skills> {
    return PocketBase.getEntityById<Skills>({ entityType: "skills", id: skillRelationId });
  }

  public static updateSkills(skills: Skills): Promise<Skills> {
    return PocketBase.updateEntity<Skills>({ entityType: "skills", entityData: skills });
  }
}
