import type {
  Beast,
  Character,
  DestinyMaiden,
  Effect,
  Faction,
  InventoryItem,
  Item,
  Memory,
  Player,
  Post,
  Race,
  Skills,
  Spec,
  Status,
} from "./Character";
import type { Form } from "./MultiForm";

export type Collection =
  | Character
  | Faction
  | Memory
  | Post
  | Player
  | Skills
  | Status
  | Race
  | Form
  | Beast
  | DestinyMaiden
  | InventoryItem
  | Item
  | Effect
  | Spec;
