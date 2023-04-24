import {
  Character,
  Effect,
  ICharacterManager,
  InventoryItem,
  Memory,
  Status,
} from "../../../../types/Character";
import PocketBase from "../../../pocketbase/PocketBase";
import { BotError } from "../../../../utils/Errors";
import { ITEM_TYPES } from "../../../../data/constants";
import { ItemFetcher } from "../../../pocketbase/ItemFetcher";
import CharacterFetcher from "../../../pocketbase/CharacterFetcher";
import MemoryFetcher from "../../../pocketbase/MemoryFetcher";
import { Properties } from "../../../../types/Utils";
import AnsenfallLeveling from "../helpers/ansenfallLeveling";
import { SkillsFetcher } from "../../../pocketbase/SkillsFetcher";

export class CharacterManager implements ICharacterManager {
  public constructor(public character: Character) {}

  async use(consumableId: InventoryItem["id"]): Promise<void> {
    const itemId = this.character.inventory?.find((itemId) => itemId === consumableId);

    if (!itemId) {
      throw new BotError("Item não encontrado no inventário.");
    }

    const [inventoryReference, item, characterStatus] = await Promise.all([
      await this.getInventoryItem(itemId),
      await ItemFetcher.getItemById(itemId),
      await this.getStatuses(this.character.status),
    ]);

    if (inventoryReference.amount < 1) {
      throw new BotError("Item não encontrado no inventário.");
    }
    if (item.type !== ITEM_TYPES.consumable) {
      throw new BotError("Item não é um consumível.");
    }

    inventoryReference.amount -= 1;
    characterStatus.health += item.health;
    characterStatus.stamina += item.stamina;
    characterStatus.hunger += item.hunger;
    characterStatus.void += item.void;

    await Promise.all([this.setInventoryItem(inventoryReference), this.setStatus(characterStatus)]);
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

  async addMemory(memoryId: string): Promise<Memory> {
    this.character.memory = memoryId;
    const memory = await MemoryFetcher.getMemoryById(this.character.memory);
    memory.characters.push(this.character.id);
    const updatedMemory = await MemoryFetcher.updateMemory(memory);
    void CharacterFetcher.updateCharacter(this.character);
    return updatedMemory;
  }

  async removeMemory(memoryId: string): Promise<void> {
    this.character.memory = "";
    const memory = await MemoryFetcher.getMemoryById(memoryId);
    memory.characters = memory.characters.filter(
      (characterId) => characterId !== this.character.id
    );
    await Promise.all([
      CharacterFetcher.updateCharacter(this.character),
      MemoryFetcher.updateMemory(memory),
    ]);
    return;
  }

  async getMemory(): Promise<Memory> {
    if (!this.character.memory) {
      throw new BotError("Personagem não possui memória no momento.");
    }
    return MemoryFetcher.getMemoryById(this.character.memory);
  }

  async getInventory(): Promise<InventoryItem[]> {
    if (!this.character.inventory) {
      return [];
    }
    const inventory = await Promise.all(
      this.character.inventory.map((itemId) => this.getInventoryItem(itemId))
    );
    return inventory.filter((item) => item.amount > 0);
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

  setInventoryItem(inventoryItem: InventoryItem): Promise<InventoryItem> {
    return PocketBase.updateEntity<InventoryItem>({
      entityType: "inventory",
      entityData: inventoryItem,
    });
  }

  getInventoryItem(inventoryItemId: InventoryItem["id"]): Promise<InventoryItem> {
    return PocketBase.getEntityById<InventoryItem>({
      entityType: "inventory",
      id: inventoryItemId,
    });
  }
}
