import { Skills, Status } from "../../../../types/Character";
import progressBar from "string-progressbar";
import getMaxStatus from "./getMaxStatus";
import { STATUS_SKILLS_RELATION } from "../../../../data/constants";

export default function getStatusBars(skills: Skills, status: Status) {
  const healthBar =
    "❤️ " +
    progressBar
      .filledBar(getMaxStatus(skills)[STATUS_SKILLS_RELATION.health], status.health, 10, "🟥", "🟩")
      .shift();

  const staminaBar =
    "🏃 " +
    progressBar
      .filledBar(
        getMaxStatus(skills)[STATUS_SKILLS_RELATION.stamina],
        status.stamina,
        10,
        "🟨",
        "🟪"
      )
      .shift();

  const voidBar =
    "💀  " +
    progressBar
      .filledBar(getMaxStatus(skills)[STATUS_SKILLS_RELATION.void], status.void, 10, "🟥", "🟪")
      .shift();

  const hungerBar =
    "🍖 " +
    progressBar
      .filledBar(getMaxStatus(skills)[STATUS_SKILLS_RELATION.hunger], status.hunger, 10, "🟥", "🟫")
      .shift();

  const sleepBar =
    "💤 " +
    progressBar
      .filledBar(getMaxStatus(skills)[STATUS_SKILLS_RELATION.sleep], status.sleep, 10, "🟥", "🟦")
      .shift();

  const despairBar =
    "❗ " +
    progressBar
      .filledBar(
        getMaxStatus(skills)[STATUS_SKILLS_RELATION.despair],
        status.despair,
        10,
        "🟥",
        "⬛"
      )
      .shift();

  return [healthBar, staminaBar, voidBar, hungerBar, sleepBar, despairBar];
}
