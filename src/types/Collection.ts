import type {
  Beast,
  Character,
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
import { CharacterBody } from "./Character";
import { BaseItem, Item } from "./Item";
import type { Form } from "./MultiForm";
import { Channel } from "./Channel";

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
