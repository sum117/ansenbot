import { Skills } from "../../../../types/Character";
import { STATUS_GAIN_PER_LEVEL } from "../../../../data/constants";
import getSafeEntries from "../../../../utils/getSafeEntries";

export default function getMaxStatus(skills: Skills) {
  const maxStatus: Record<string, number> = {};
  for (const [key, value] of getSafeEntries(skills)) {
    if (typeof value !== "number") {
      continue;
    }
    maxStatus[key] = 100 + STATUS_GAIN_PER_LEVEL * value;
  }

  return maxStatus;
}
