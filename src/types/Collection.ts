import type { Channel } from "./Channel";
import type {
  Beast,
  Character,
  CharacterBody,
  DestinyMaiden,
  Effect,
  Faction,
  Inventory,
  Memory,
  Player,
  Post,
  Race,
  Skills,
  Spec,
  Status,
} from "./Character";
import type { BaseItem, Item } from "./Item";
import type { Form } from "./MultiForm";

export type Collection =
  | Character
  | Faction
  | Memory
  | Post
  | Player
  | Skills
  | BaseItem
  | Status
  | Race
  | Form
  | CharacterBody
  | Beast
  | DestinyMaiden
  | Inventory
  | Item
  | Effect
  | Channel
  | Spec;
