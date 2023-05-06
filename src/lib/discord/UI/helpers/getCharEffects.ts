import { statesDictionary } from "../../../../data/translations";
import type { Effect, Status } from "../../../../types/Character";
import type { Properties } from "../../../../types/Utils.js";
import { EffectFetcher } from "../../../pocketbase/EffectFetcher";

export default async function getCharEffects(
  status: Status
): Promise<Array<"Nenhum" | Properties<typeof statesDictionary>>> {
  const effects: Effect[] = (
    await Promise.all(
      status.effects.map((effect) => EffectFetcher.getEffectById(effect).catch(() => null))
    )
  ).filter((effect): effect is Effect => effect !== null);

  if (effects.length === 0) {
    return ["Nenhum"];
  }

  return effects.map((effect) => statesDictionary[effect.name as keyof typeof statesDictionary]);
}
