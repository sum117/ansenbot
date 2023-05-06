import progressBar from "string-progressbar";

import { STATUS_SKILLS_RELATION } from "../../../../data/constants";
import type { Skills, Status } from "../../../../types/Character";
import getMaxStatus from "../../Character/helpers/getMaxStatus";

export default function getStatusBars(skills: Skills, status: Status): Array<string> {
  const healthBar =
    "❤️ " +
    progressBar
      .filledBar(getMaxStatus(skills)[STATUS_SKILLS_RELATION.health], status.health, 7, "🟥", "🟩")
      .shift();

  const staminaBar =
    "🏃 " +
    progressBar
      .filledBar(
        getMaxStatus(skills)[STATUS_SKILLS_RELATION.stamina],
        status.stamina,
        7,
        "🟥",
        "🟨"
      )
      .shift();

  // TODO: Keep this for future use!
  // const manaBar =
  //   "🔮 " +
  //   progressBar
  //     .filledBar(getMaxStatus(skills)[STATUS_SKILLS_RELATION.mana], status.mana, 7, "🟥", "🟦")
  //     .shift();

  const voidBar =
    "💀  " +
    progressBar
      .filledBar(getMaxStatus(skills)[STATUS_SKILLS_RELATION.void], status.void, 7, "🟥", "🟪")
      .shift();

  const hungerBar =
    "🍖 " +
    progressBar
      .filledBar(getMaxStatus(skills)[STATUS_SKILLS_RELATION.hunger], status.hunger, 7, "🟥", "🟫")
      .shift();

  const sleepBar =
    "💤 " +
    progressBar
      .filledBar(getMaxStatus(skills)[STATUS_SKILLS_RELATION.sleep], status.sleep, 7, "🟥", "🟦")
      .shift();

  const despairBar =
    "❗ " +
    progressBar
      .filledBar(
        getMaxStatus(skills)[STATUS_SKILLS_RELATION.despair],
        status.despair,
        7,
        "🟥",
        "⬛"
      )
      .shift();

  return [healthBar, staminaBar, voidBar, hungerBar, sleepBar, despairBar];
}
