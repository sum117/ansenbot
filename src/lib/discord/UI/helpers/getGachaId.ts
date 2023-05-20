import { GACHA_ID_PREFIX } from "../../../../data/constants";
import type { GachaParam } from "../../../../types/Item";

export default function getGachaId(param: GachaParam): string {
  return `${GACHA_ID_PREFIX}:${param}`;
}
