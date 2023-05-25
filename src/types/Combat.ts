import type { ButtonInteraction, Snowflake, StringSelectMenuInteraction } from "discord.js";

import type { equipmentDictionary, statusDictionary } from "../data/translations";
import type { CharacterManager } from "../lib/discord/Character/classes/CharacterManager";
import type { Status } from "./Character";

export type SelectMenuAttackKind = "spell" | "body";
export type SelectMenuSupportKind = "spell";
export type SelectMenuKind = SelectMenuAttackKind | SelectMenuSupportKind;

export type ButtonDefenseKind = "dodge" | "block" | "counter" | "flee";
export type ButtonAttackKind = "commit" | "flee" | "pass";
export type ButtonSupportKind = "sacrifice" | "pass";
export type ButtonKind = ButtonDefenseKind | ButtonAttackKind | ButtonSupportKind;

export interface BaseTurn {
  targetId: Snowflake;
  action: "attack" | "support" | "defense";
  kind: SelectMenuKind | ButtonKind;
  spellId?: string;
}

export interface DuelTurn extends BaseTurn {
  kind: SelectMenuAttackKind | ButtonAttackKind | ButtonDefenseKind;
  bodyPart?: BodyPart;
}

export interface SupportTurn extends BaseTurn {
  kind: SelectMenuSupportKind | ButtonSupportKind;
}

export type Turn = DuelTurn | SupportTurn;

export interface SelectMenuInteractionParameters {
  kind: SelectMenuKind;
  agent: CharacterManager;
  target: CharacterManager;
  interactionValue: string;
  bodyPart?: BodyPart;
}

export interface BaseButtonInteractionParameters {
  kind: ButtonKind;
  agent: CharacterManager;
  target: CharacterManager;
}

export interface AttackButtonInteractionParameters extends BaseButtonInteractionParameters {
  kind: ButtonAttackKind;
}

export interface DefenseButtonInteractionParameters extends BaseButtonInteractionParameters {
  kind: ButtonDefenseKind;
}

export interface SupportButtonInteractionParameters extends BaseButtonInteractionParameters {
  kind: ButtonSupportKind;
}

export type ButtonInteractionParameters =
  | SupportButtonInteractionParameters
  | AttackButtonInteractionParameters
  | DefenseButtonInteractionParameters;

export type SelectMenuInteractionHandler = (
  interaction: StringSelectMenuInteraction,
  data: SelectMenuInteractionParameters
) => Promise<void>;

export type ButtonInteractionHandler = (
  interaction: ButtonInteraction,
  data: ButtonInteractionParameters
) => Promise<void>;

export type BodyPart = keyof Omit<typeof equipmentDictionary, "spells" | "amulet" | "rings">;

export interface AttackTurnResult {
  defenseSuccess: boolean;
  damageDealt: number;
  isKillingBlow: boolean;
  weaponUsed?: string;
  status?: Status;
  odds: {
    dodge: [number, number];
    counter: [number, number];
    block: [number, number];
    flee: [number, number];
  };
}

export interface SupportTurnResult {
  statusesReplenished: Array<keyof typeof statusDictionary>;
  amount: number;
  status: Status;
  spellUsed?: string;
}

export type TurnResult = AttackTurnResult | SupportTurnResult;
