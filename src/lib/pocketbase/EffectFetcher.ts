import type { Effect } from "../../types/Character";
import PocketBase from "./PocketBase";

export class EffectFetcher {
  public static async getEffectById(effectId: string): Promise<Effect> {
    return PocketBase.getEntityById<Effect>({ entityType: "effects", id: effectId });
  }

  public static async getBaseEffects(): Promise<Array<Effect>> {
    const status = ["health", "stamina", "hunger", "void", "despair", "sleep"];

    const effects = await PocketBase.getAllEntities<Effect>({
      entityType: "effects",
      page: 1,
    });

    return effects.items.filter((effect) => status.includes(effect.name));
  }
}
