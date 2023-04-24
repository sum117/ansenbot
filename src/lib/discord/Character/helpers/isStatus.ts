import { STATUS_SKILLS_RELATION } from "../../../../data/constants";

export default function isStatus(stat: unknown): stat is keyof typeof STATUS_SKILLS_RELATION {
  return typeof stat === "string" && Object.keys(STATUS_SKILLS_RELATION).includes(stat);
}
