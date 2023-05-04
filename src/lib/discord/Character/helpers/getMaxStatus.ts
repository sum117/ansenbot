import { STATUS_GAIN_PER_LEVEL } from "../../../../data/constants";
import type { skillsDictionary } from "../../../../data/translations";
import type { Skills } from "../../../../types/Character";
import getSafeEntries from "../../../../utils/getSafeEntries";

export default function getMaxStatus(skills: Skills) {
  const maxStatus: Record<string, number> = {};
  for (const [key, value] of getSafeEntries(skills)) {
    if (typeof value !== "number") {
      continue;
    }
    maxStatus[key] = 100 + STATUS_GAIN_PER_LEVEL * value;
  }

  return maxStatus as Record<keyof typeof skillsDictionary, number>;
}
