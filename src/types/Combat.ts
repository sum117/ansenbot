import type { ButtonInteraction, Snowflake, StringSelectMenuInteraction } from "discord.js";

import type { equipmentDictionary, statusDictionary } from "../data/translations";
import type { CharacterManager } from "../lib/discord/Character/classes/CharacterManager";
import type { SkillKey, Status } from "./Character";

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
  equipmentTypes: [SkillKey | undefined, SkillKey | undefined];
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

export interface ResolvedSupportTurn {
  statusesReplenished: Array<keyof typeof statusDictionary>;
  amount: number;
  status: Status;
}

export enum AgentDamageReductionFactor {
  Dodge = 0.25,
  Block = 0,
  Flee = 0,
  Sacrifice = 3,
}

export enum TargetDefenseReductionFactor {
  Stamina = 0.05,
  Block = 0.1,
  Flee = 0.15,
  Counter = 0.1,
}

export enum TargetFailedDefenseReductionFactor {
  Stamina = 0.1,
  Block = 0.15,
  Flee = 0.25,
  Counter = 0.2,
}

export enum TargetSkillWeightDivisor {
  Dexterity = 2,
  Stamina = 10,
  Fortitude = 2,
}

export enum TargetSkillWeightMultiplier {
  Dexterity = 0.4,
  Stamina = 0.8,
  Strength = 0.4,
  Charisma = 0.1,
}

export enum AgentSkillWeightDivisor {
  Stamina = 20,
}
