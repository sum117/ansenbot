import { STATUS_GAIN_PER_LEVEL, STATUS_SKILLS_RELATION } from "../../../../data/constants";
import type { skillsDictionary } from "../../../../data/translations";
import type { Skills } from "../../../../types/Character";
import getSafeEntries from "../../../../utils/getSafeEntries";

export default function getMaxStatus(
  skills: Skills
): Record<keyof typeof skillsDictionary, number> {
  const maxStatus: Record<string, number> = {};
  for (const [status, skill] of getSafeEntries(STATUS_SKILLS_RELATION)) {
    const value = skills[skill];
    maxStatus[skill] = 100 + STATUS_GAIN_PER_LEVEL[status] * value;
  }
  return maxStatus;
}
