import progressBar from "string-progressbar";

import {
  EMPTY_BAR_EMOJI,
  STATUS_BAR_DETAILS,
  STATUS_SKILLS_RELATION,
} from "../../../../data/constants";
import type { Skills, Status } from "../../../../types/Character";
import getSafeEntries from "../../../../utils/getSafeEntries";
import getMaxStatus from "../../Character/helpers/getMaxStatus";

function createStatusBar(
  maxStatus: number,
  currentStatus: number,
  emoji: string,
  color: string
): string {
  return `${emoji} ${progressBar
    .filledBar(maxStatus, currentStatus, 4, EMPTY_BAR_EMOJI, color)
    .shift()} ${Math.floor(currentStatus)}/${Math.floor(maxStatus)}`;
}

export default function getStatusBars(skills: Skills, status: Status): Array<string> {
  const maxStatus = getMaxStatus(skills);

  return getSafeEntries(STATUS_SKILLS_RELATION).map(([statusName, statusKey]) => {
    const { emoji, color } = STATUS_BAR_DETAILS[statusName as keyof typeof STATUS_SKILLS_RELATION];
    return createStatusBar(maxStatus[statusKey], status[statusName], emoji, color);
  });
}
