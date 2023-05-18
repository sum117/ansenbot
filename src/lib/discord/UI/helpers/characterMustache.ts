import mustache from "mustache";

import type { Character } from "../../../../types/Character";

export default function getCharacterMustache(character: Character) {
  return (template: string): string => mustache.render(template, { character });
}
