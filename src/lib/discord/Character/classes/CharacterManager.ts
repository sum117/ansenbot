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
import { COLLECTIONS } from "../../../../data/constants";
import CharacterFetcher from "../../../pocketbase/CharacterFetcher";
import MemoryFetcher from "../../../pocketbase/MemoryFetcher";
import { Properties } from "../../../../types/Utils";
import AnsenfallLeveling from "../helpers/ansenfallLeveling";
import { SkillsFetcher } from "../../../pocketbase/SkillsFetcher";
import { EquipmentItem, Item } from "../../../../types/Item";
import { consumableSchema, equipmentSchema } from "../../../../schemas/characterSchema";

export class CharacterManager implements ICharacterManager {
  public constructor(public character: Character) {}

  async use(consumableId: Inventory["id"]): Promise<void> {
    const consumableItem = consumableSchema.parse(this.getInventoryItem(consumableId));
    const characterStatus = await this.getStatuses(this.character.status);

    if (consumableItem.quantity < 1) {
      throw new BotError("Item não encontrado no inventário.");
    }

    consumableItem.quantity -= 1;
    characterStatus.health += consumableItem.health;
    characterStatus.stamina += consumableItem.stamina;
    characterStatus.hunger += consumableItem.hunger;
    characterStatus.void += consumableItem.void;

    await Promise.all([this.setInventoryItem(consumableItem), this.setStatus(characterStatus)]);
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

  setStatus(status: Status): Promise<Status> {
    return PocketBase.updateEntity<Status>({
      entityType: "status",
      entityData: status,
    });
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

  setInventoryItem(item: Item): Promise<Item> {
    return PocketBase.updateEntity<Item>({
      entityType: item.collectionName as keyof typeof COLLECTIONS,
      entityData: item,
    });
  }

  getInventoryItem(inventoryItemId: Inventory["id"]): Item {
    const item = [
      ...(this.character.expand.inventory.expand.consumables ?? []),
      ...(this.character.expand.inventory.expand.spells ?? []),
      ...(this.character.expand.inventory.expand.equipments ?? []),
    ].find((item) => item.id === inventoryItemId);

    if (!item || item.quantity < 1) {
      throw new BotError("Item não encontrado no inventário.");
    }

    return item;
  }

  async getEquipmentItem(
    slot: keyof CharacterBody["expand"]
  ): Promise<CharacterBody[keyof CharacterBody] | undefined> {
    const body = await PocketBase.getEntityById<CharacterBody>({
      entityType: "body",
      id: this.character.body,
    });

    return body.expand?.[slot];
  }

  async setEquipment(equipment: Item): Promise<CharacterBody> {
    this.validateInventoryItem(equipment);
    equipment = equipmentSchema.parse(equipment);

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

  private validateInventoryItem(item: Item): void {
    if (item.quantity < 0) {
      throw new BotError("Item não encontrado no inventário ou insuficiente.");
    }

    if (item.expand.item.type !== "equipment") {
      throw new BotError("Item não é um item equipável.");
    }
  }

  private async unequipItem(
    equipment: EquipmentItem,
    body: CharacterBody,
    slot: keyof CharacterBody
  ): Promise<CharacterBody> {
    equipment.quantity += 1;
    equipment.isEquipped = false;
    await this.setInventoryItem(equipment);

    const filterRing = (ring: string) => ring !== body[slot];
    const updatedEquipment = {
      ...body,
      [slot]: slot === "rings" ? body.rings.filter(filterRing) : "",
    };

    return this.updateCharacterBody(updatedEquipment);
  }

  private async swapEquippedItem(
    equipment: EquipmentItem,
    body: CharacterBody,
    slot: keyof CharacterBody,
    previousItems: string[]
  ): Promise<CharacterBody> {
    const previousItem = equipmentSchema.parse(await this.getInventoryItem(previousItems[0]));

    previousItem.quantity += 1;
    previousItem.isEquipped = false;
    await this.setInventoryItem(previousItem);

    equipment.quantity -= 1;
    equipment.isEquipped = true;
    await this.setInventoryItem(equipment);

    const updatedEquipment = {
      ...body,
      [slot]: equipment.id,
    };

    return this.updateCharacterBody(updatedEquipment);
  }

  private async equipNewItem(
    equipment: EquipmentItem,
    body: CharacterBody,
    slot: keyof CharacterBody
  ): Promise<CharacterBody> {
    equipment.quantity -= 1;
    equipment.isEquipped = true;
    await this.setInventoryItem(equipment);
    const updatedEquipment = {
      ...body,
      [slot]: slot === "rings" ? [...body.rings, equipment.id] : equipment.id,
    };

    return this.updateCharacterBody(updatedEquipment);
  }

  private updateCharacterBody(entityData: CharacterBody): Promise<CharacterBody> {
    return PocketBase.updateEntity<CharacterBody>({
      entityType: "body",
      entityData: entityData,
    });
  }
}
