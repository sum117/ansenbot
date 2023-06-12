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
import type { BaseItem, Item, Recipe } from "./Item";
import type { Form } from "./MultiForm";
import type { Reign } from "./Reign";

export type Collection =
  | Recipe
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
  | Reign
  | Spec;
