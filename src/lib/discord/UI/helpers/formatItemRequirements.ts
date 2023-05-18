import { bold } from "discord.js";

import { SKILLS_EMOJIS } from "../../../../data/constants";
import type { skillsDictionary } from "../../../../data/translations";
import type { PartialRequirements } from "../../../../types/Item";
import getSafeEntries from "../../../../utils/getSafeEntries";

export default function formatItemRequirements(requirements: PartialRequirements): string {
  return getSafeEntries(requirements)
    .filter((entries): entries is [keyof typeof skillsDictionary, number] => Boolean(entries[1]))
    .map(([skill, value]) => `${SKILLS_EMOJIS[skill]} ${bold(String(value))}`)
    .join(" | ");
}
