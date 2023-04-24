import PocketBase from "./PocketBase";
import { Effect } from "../../types/Character";

export class EffectFetcher {
  public static async getEffectById(effectId: string): Promise<Effect> {
    return PocketBase.getEntityById<Effect>({ entityType: "effects", id: effectId });
  }

  public static async getBaseEffects() {
    const status = ["health", "stamina", "hunger", "void", "despair", "sleep"];

    const effects = await PocketBase.getAllEntities<Effect>({
      entityType: "effects",
      page: 1,
    });

    return effects.items.filter((effect) => status.includes(effect.name));
  }
}
