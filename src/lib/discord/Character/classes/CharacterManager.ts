import {
  Character,
  CharacterBody,
  Effect,
  ICharacterManager,
  Inventory,
  Memory,
  Status,
} from "../../../../types/Character";
import PocketBase from "../../../pocketbase/PocketBase";
import { BotError } from "../../../../utils/Errors";
import { COLLECTIONS, STATUS_SKILLS_RELATION } from "../../../../data/constants";
import CharacterFetcher from "../../../pocketbase/CharacterFetcher";
import MemoryFetcher from "../../../pocketbase/MemoryFetcher";
import { Properties } from "../../../../types/Utils";
import AnsenfallLeveling from "../helpers/ansenfallLeveling";
import { SkillsFetcher } from "../../../pocketbase/SkillsFetcher";
import { EquipmentItem, Item, SpellItem } from "../../../../types/Item";
import {
  consumableSchema,
  equipmentSchema,
  spellSchema,
} from "../../../../schemas/characterSchema";
import mustache from "mustache";
import { userMention } from "discord.js";
import getMaxStatus from "../helpers/getMaxStatus";
import getSafeEntries from "../../../../utils/getSafeEntries";
import removePocketbaseConstants from "../../../../utils/removePocketbaseConstants";
import { equipmentDictionary } from "../../../../data/translations";
import { BodyPart } from "../../../../types/Combat";

export class CharacterManager implements ICharacterManager {
  public constructor(public character: Character) {}

  async use(consumableId: Item["id"]): Promise<string> {
    const consumableItem = consumableSchema.parse(this.getInventoryItem(consumableId));
    const characterStatus = await this.getStatuses(this.character.status);
    const view = {
      character: this.character.name,
      item: consumableItem.expand.item.name,
      author: userMention(this.character.playerId),
      hunger: consumableItem.hunger,
      health: consumableItem.health,
      stamina: consumableItem.stamina,
      void: consumableItem.void,
    };

    consumableItem.quantity -= 1;
    characterStatus.health += consumableItem.health;
    characterStatus.stamina += consumableItem.stamina;
    characterStatus.hunger += consumableItem.hunger;
    characterStatus.void += consumableItem.void;

    await Promise.all([this.setInventoryItem(consumableItem), this.setStatus(characterStatus)]);
    return mustache.render(
      "✅ {{{author}}}, {{{character}}} usou {{{item}}} e recuperou {{{health}}} de vida, {{{stamina}}} de estamina, {{{hunger}}} de fome e {{{void}}} de vazio.",
      view
    );
  }

  async discard(itemId: Item["id"]): Promise<string> {
    const item = consumableSchema
      .or(equipmentSchema)
      .or(spellSchema)
      .parse(await this.getInventoryItem(itemId));
    item.quantity -= 1;
    await this.setInventoryItem(item);
    return mustache.render("{{{author}}}, {{{character}}} descartou 1 de {{{item}}}.", {
      author: userMention(this.character.playerId),
      character: this.character.name,
      item: item.expand.item.name,
    });
  }

  async sleep(hours: number): Promise<void> {
    const characterStatus = await this.getStatuses(this.character.status);
    characterStatus.stamina += hours * 10;
    characterStatus.hunger -= hours * 10;
    characterStatus.void += hours * 10;
    characterStatus.sleep += hours;
    await this.setStatus(characterStatus);
  }

  async heal(amount: number): Promise<void> {
    const characterStatus = await this.getStatuses(this.character.status);
    characterStatus.health += amount;
    await this.setStatus(characterStatus);
  }

  async takeDamage(damage: number): Promise<void> {
    const characterStatus = await this.getStatuses(this.character.status);
    characterStatus.health -= damage;
    await this.setStatus(characterStatus);
  }

  async addXp(amount: number): Promise<number> {
    const skills = await SkillsFetcher.getSkillsById(this.character.skills);
    const leveling = new AnsenfallLeveling(skills, this.character);
    leveling.addCharacterPoints(amount);
    let didLevelUp = false;
    while (leveling.canLevelUpCharacter()) {
      leveling.levelUpCharacter();
      didLevelUp = true;
    }

    this.character.level = leveling.characterLevel;
    this.character.xp = leveling.characterXp;
    this.character.skillPoints = leveling.characterSpareSkillPoints;

    await CharacterFetcher.updateCharacter(this.character);
    return didLevelUp ? leveling.characterLevel : 0;
  }

  async addSpirit(amount: number): Promise<number> {
    const characterStatus = await this.getStatuses(this.character.status);
    characterStatus.spirit += amount;
    await this.setStatus(characterStatus);
    return characterStatus.spirit;
  }

  async applyEffect(effect: Effect): Promise<void> {
    const characterStatus = await this.getStatuses(this.character.status);
    characterStatus.effects.push(effect.id);
    await this.setStatus(characterStatus);
  }

  async addMemory(memoryId: string): Promise<void> {
    this.character.memory = memoryId;
    void CharacterFetcher.updateCharacter(this.character);
  }

  async removeMemory(memoryId: string): Promise<void> {
    this.character.memory = "";

    await CharacterFetcher.updateCharacter(this.character);

    return;
  }

  async getMemory(): Promise<Memory> {
    if (!this.character.memory) {
      throw new BotError("Personagem não possui memória no momento.");
    }
    return MemoryFetcher.getMemoryById(this.character.memory);
  }

  getInventory(): Inventory {
    return this.character.expand.inventory;
  }

  async setStatus(status: Status): Promise<Status> {
    const maxStatuses = getMaxStatus(this.character.expand.skills);
    console.log(maxStatuses);
    for (const [key, value] of getSafeEntries(removePocketbaseConstants(status))) {
      if (typeof value !== "number" || key === "immune" || key === "effects" || key === "spirit") {
        continue;
      }

      const skill = STATUS_SKILLS_RELATION[key];
      const maxStatus = maxStatuses[skill];

      console.log("maxStatus", maxStatus, "value", value);
      if (value > maxStatus) {
        status[key] = maxStatus;
      }
      console.log("status", status);
    }
    const updatedStatus = PocketBase.updateEntity<Status>({
      entityType: "status",
      entityData: status,
    });
    this.character = await CharacterFetcher.getCharacterById(this.character.id);
    return updatedStatus;
  }

  async getStatuses(statusId: Status["id"]): Promise<Status> {
    return PocketBase.getEntityById<Status>({
      entityType: "status",
      id: statusId,
      expandFields: false,
    });
  }

  async getStatus(statusKey: keyof Status): Promise<Properties<Status>> {
    return this.getStatuses(this.character.status).then((status) => status[statusKey]);
  }

  async setInventoryItem(item: Item): Promise<Item> {
    if (item.quantity <= 0) {
      await PocketBase.deleteEntity({
        entityType: item.collectionName as keyof typeof COLLECTIONS,
        id: item.id,
      });
      return item;
    }
    return PocketBase.updateEntity<Item>({
      entityType: item.collectionName as keyof typeof COLLECTIONS,
      entityData: item,
    });
  }

  getInventoryItem(inventoryItemId: Inventory["id"]): Item | undefined {
    const item = [
      ...(this.character.expand.inventory.expand.consumables ?? []),
      ...(this.character.expand.inventory.expand.spells ?? []),
      ...(this.character.expand.inventory.expand.equipments ?? []),
    ].find((item) => item.id === inventoryItemId);

    return item;
  }

  async getEquipmentItem<T extends BodyPart>(slot: T): Promise<EquipmentItem | undefined>;
  async getEquipmentItem<T extends keyof typeof equipmentDictionary>(
    slot: T
  ): Promise<EquipmentItem | EquipmentItem[] | SpellItem[] | undefined>;
  async getEquipmentItem(slot: BodyPart | keyof typeof equipmentDictionary) {
    const body = await PocketBase.getEntityById<CharacterBody>({
      entityType: "body",
      id: this.character.body,
    });

    return body.expand?.[slot];
  }

  async setEquipment(equipment: Item): Promise<CharacterBody> {
    equipment = equipmentSchema.or(spellSchema).parse(equipment);

    const slot = equipment.slot;
    const body = await this.getEquipment();

    const equippedItem = body[slot];
    const previousItems = Array.isArray(equippedItem) ? equippedItem : [equippedItem];

    if (previousItems.includes(equipment.id)) {
      return this.unequipItem(equipment, body, slot);
    } else if (previousItems.length && slot !== "rings") {
      return this.swapEquippedItem(equipment, body, slot, previousItems);
    } else {
      return this.equipNewItem(equipment, body, slot);
    }
  }

  getEquipment(): Promise<CharacterBody> {
    return PocketBase.getEntityById<CharacterBody>({
      entityType: "body",
      id: this.character.body,
    });
  }

  private async unequipItem(
    equipment: EquipmentItem | SpellItem,
    body: CharacterBody,
    slot: keyof CharacterBody
  ): Promise<CharacterBody> {
    equipment.isEquipped = false;
    await this.setInventoryItem(equipment);

    const updatedEquipment = {
      ...body,
      [slot]:
        slot === "rings" || slot === "spells"
          ? body[slot].filter((item) => item !== equipment.id)
          : "",
    };

    return this.updateCharacterBody(updatedEquipment);
  }

  private async swapEquippedItem(
    equipment: EquipmentItem | SpellItem,
    body: CharacterBody,
    slot: keyof CharacterBody,
    previousItems: string[]
  ): Promise<CharacterBody> {
    const previousItem = equipmentSchema.safeParse(this.getInventoryItem(previousItems[0]));

    if (previousItem.success) {
      previousItem.data.isEquipped = false;
      await this.setInventoryItem(previousItem.data);
    }

    equipment.isEquipped = true;
    await this.setInventoryItem(equipment);

    const updatedEquipment = {
      ...body,
      [slot]: equipment.id,
    };

    return this.updateCharacterBody(updatedEquipment);
  }

  private async equipNewItem(
    equipment: EquipmentItem | SpellItem,
    body: CharacterBody,
    slot: keyof CharacterBody
  ): Promise<CharacterBody> {
    equipment.isEquipped = true;
    await this.setInventoryItem(equipment);
    const updatedEquipment = {
      ...body,
      [slot]: slot === "rings" || slot === "spells" ? [...body[slot], equipment.id] : equipment.id,
    };

    return this.updateCharacterBody(updatedEquipment);
  }

  private async updateCharacterBody(entityData: CharacterBody): Promise<CharacterBody> {
    const updatedBody = await PocketBase.updateEntity<CharacterBody>({
      entityType: "body",
      entityData: entityData,
    });
    this.character = await CharacterFetcher.getCharacterById(this.character.id);
    return updatedBody;
  }
}
