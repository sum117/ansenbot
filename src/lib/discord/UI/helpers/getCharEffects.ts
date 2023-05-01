import { Effect, Status } from "../../../../types/Character";
import { EffectFetcher } from "../../../pocketbase/EffectFetcher";
import { statesDictionary } from "../../../../data/translations";

export default async function getCharEffects(status: Status) {
  const effects: Effect[] = (
    await Promise.all(
      status.effects.map((effect) => EffectFetcher.getEffectById(effect).catch(() => null))
    )
  ).filter((effect): effect is Effect => effect !== null);

  if (effects.length === 0) {
    return ["Nenhum"];
  }

  const stateArray = effects.map(
    (effect) => statesDictionary[effect.name as keyof typeof statesDictionary]
  );

  return stateArray;
}
