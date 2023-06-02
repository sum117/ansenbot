import { userMention } from "discord.js";
import mustache from "mustache";

import type { COLLECTIONS } from "../../../../data/constants";
import { STATUS_SKILLS_RELATION } from "../../../../data/constants";
import type { equipmentDictionary } from "../../../../data/translations";
import { skillsDictionary } from "../../../../data/translations";
import {
  consumableSchema,
  equipmentSchema,
  skillsSchema,
  spellSchema,
} from "../../../../schemas/characterSchema";
import type {
  Character,
  CharacterBody,
  Effect,
  Inventory,
  Memory,
  Status,
} from "../../../../types/Character";
import type { BodyPart } from "../../../../types/Combat";
import type { EquipmentItem, Item, ItemWithRole, SpellItem } from "../../../../types/Item";
import type { Properties } from "../../../../types/Utils";
import { BotError } from "../../../../utils/Errors";
import getSafeKeys from "../../../../utils/getSafeKeys";
import CharacterFetcher from "../../../pocketbase/CharacterFetcher";
import { ItemFetcher } from "../../../pocketbase/ItemFetcher";
import MemoryFetcher from "../../../pocketbase/MemoryFetcher";
import PocketBase from "../../../pocketbase/PocketBase";
import { SkillsFetcher } from "../../../pocketbase/SkillsFetcher";
import AnsenfallLeveling from "../helpers/ansenfallLeveling";
import getMaxStatus from "../helpers/getMaxStatus";

type InventoryKeys = "consumables" | "equipments" | "spells";

export class CharacterManager {
  private readonly itemRefExpandKeys = {
    spells: "spells(item)",
    equipments: "equipments(item)",
    consumables: "consumables(item)",
  } as const;

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

  async pay(amount: number, targetManager: CharacterManager): Promise<string> {
    const characterStatus = await this.getStatuses(this.character.status);
    const targetCharacterStatus = await this.getStatuses(targetManager.character.status);
    if (characterStatus.spirit < amount) {
      throw new BotError(
        mustache.render(
          "Você não possui espírito suficiente para pagar {{{amount}}} de espírito.",
          { amount }
        )
      );
    }
    if (targetManager.character.id === this.character.id) {
      throw new BotError("Você não pode pagar a si mesmo.");
    }

    characterStatus.spirit -= amount;
    targetCharacterStatus.spirit += amount;

    await Promise.all([
      this.setStatus(characterStatus),
      targetManager.setStatus(targetCharacterStatus),
    ]);

    return mustache.render(
      "✅ {{{character}}} pagou **{{{amount}}}** lascas espirituais para {{{targetCharacter}}}.",
      {
        character: this.character.name,
        amount,
        targetCharacter: targetManager.character.name,
      }
    );
  }
  async give(
    itemId: Item["id"],
    quantity: number,
    targetManager: CharacterManager
  ): Promise<string> {
    if (quantity <= 0) {
      throw new BotError("Você não pode dar uma quantidade menor ou igual a 0.");
    }
    const item = this.getParsedItem(itemId);
    if (item.quantity < quantity || item.quantity <= 0) {
      throw new BotError(
        mustache.render(
          "Você não possui a quantidade ({{{quantity}}}) especificada de {{{itemName}}} para dar.",
          { quantity, itemName: item.expand.item.name }
        )
      );
    }
    item.quantity -= quantity;

    const targetInventory = targetManager.getInventory();
    const itemRef = await ItemFetcher.getItemWithRole(item.item);
    const targetItem = this.findInventoryItemRef(targetInventory, item);

    if (!targetItem) {
      await this.addMultipleInventoryItems(quantity, targetManager, itemRef);
    } else {
      targetItem.quantity += quantity;
      await targetManager.setInventoryItem(targetItem);
    }

    await this.setInventoryItem(item);

    return mustache.render(
      "✅ {{{character}}} deu **{{{quantity}}}** de {{{item}}} para {{{targetCharacter}}}.",
      {
        character: this.character.name,
        quantity,
        item: item.expand.item.name,
        targetCharacter: targetManager.character.name,
      }
    );
  }

  private async addMultipleInventoryItems(
    quantity: number,
    targetManager: CharacterManager,
    itemRef: ItemWithRole
  ) {
    await new Promise((resolve, reject) => {
      for (let i = 0; i < quantity; i++) {
        targetManager
          .addInventoryItem(itemRef)
          .then(() => resolve(true))
          .catch((error) => {
            reject(error);
          });
      }
    });
  }

  async discard(itemId: Item["id"]): Promise<string> {
    const item = this.getParsedItem(itemId);
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

  async levelUpSkill(skillName: keyof typeof skillsDictionary, times?: number): Promise<Character> {
    const skills = await SkillsFetcher.getSkillsById(this.character.skills);
    const leveling = new AnsenfallLeveling(skills, this.character);
    const errorMessage =
      "❌ Você provavelmente não tem pontos de skill suficientes para fazer isso, ou o nível da Skill já está muito alto.";

    if (times) {
      for (let i = 0; i < times; i++) {
        if (!leveling.increaseSkill(skillName)) {
          throw new BotError(errorMessage);
        }
      }
    } else {
      if (!leveling.increaseSkill(skillName)) {
        throw new BotError(errorMessage);
      }
    }
    const newLevel = leveling.characterSkills[skillName];
    if (!newLevel) {
      throw new BotError(errorMessage);
    }

    skills[skillName] = newLevel;
    this.character.skillPoints = leveling.characterSpareSkillPoints;

    const [character] = await Promise.all([
      CharacterFetcher.updateCharacter(this.character),
      SkillsFetcher.updateSkills(skills),
    ]);
    return character;
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
    await CharacterFetcher.updateCharacter(this.character);
  }

  async removeMemory(): Promise<void> {
    this.character.memory = "";
    await CharacterFetcher.updateCharacter(this.character);
    return;
  }

  getMemory(): Promise<Memory> {
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

    for (const statusSkillRelKey of getSafeKeys(STATUS_SKILLS_RELATION)) {
      const skill = STATUS_SKILLS_RELATION[statusSkillRelKey];
      const maxStatus = maxStatuses[skill];
      const value = status[statusSkillRelKey];
      if (value > maxStatus) {
        status[statusSkillRelKey] = maxStatus;
      }
    }

    const updatedStatus = PocketBase.updateEntity<Status>({
      entityType: "status",
      entityData: status,
    });
    this.character = await CharacterFetcher.getCharacterById(this.character.id);
    return updatedStatus;
  }

  getStatuses(statusId: Status["id"]): Promise<Status> {
    return PocketBase.getEntityById<Status>({
      entityType: "status",
      id: statusId,
      expandFields: false,
    });
  }

  getStatus(statusKey: keyof Status): Promise<Properties<Status>> {
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

  private findInventoryItemRef(targetInventory: Inventory, item: Item) {
    const inventory = targetInventory.expand[item.collectionName as InventoryKeys];
    if (!inventory) {
      return;
    }
    for (const itemToTrade of inventory) {
      if (itemToTrade.item === item.item) {
        return itemToTrade;
      }
    }
  }

  public async addInventoryItem(itemRef: ItemWithRole): Promise<true> {
    const inventory = this.getInventory();
    const itemType = (itemRef.type + "s") as "consumables" | "equipments" | "spells";

    const item = itemRef.expand?.[this.itemRefExpandKeys[itemType]].find(
      (item) => item.item === itemRef.id
    );
    if (!item) {
      throw new BotError("Item não encontrado no sistema.");
    }

    const isAlreadyInInventory = inventory[itemType].includes(item.id);
    if (isAlreadyInInventory) {
      item.quantity += 1;
      await this.setInventoryItem(item);
      return true;
    }
    const newItem = await ItemFetcher.createItemClone({ ...item, quantity: 1, id: "" });
    switch (itemRef.type) {
      case "consumable":
        inventory.consumables.push(newItem.id);
        break;
      case "equipment":
        inventory.equipments.push(newItem.id);
        break;
      case "spell":
        inventory.spells.push(newItem.id);
        break;
    }

    await PocketBase.updateEntity<Inventory>({
      entityType: "inventory",
      entityData: { ...inventory },
    });

    return true;
  }

  getInventoryItem(inventoryItemId: Inventory["id"]): Item | undefined {
    return [
      ...(this.character.expand.inventory.expand.consumables ?? []),
      ...(this.character.expand.inventory.expand.spells ?? []),
      ...(this.character.expand.inventory.expand.equipments ?? []),
    ].find((item) => item.id === inventoryItemId);
  }

  async getEquipmentItem<T extends BodyPart>(slot: T): Promise<EquipmentItem | undefined>;
  async getEquipmentItem<T extends keyof typeof equipmentDictionary>(
    slot: T
  ): Promise<EquipmentItem | EquipmentItem[] | SpellItem[] | undefined>;
  async getEquipmentItem(
    slot: BodyPart | keyof typeof equipmentDictionary
  ): Promise<EquipmentItem | EquipmentItem[] | SpellItem[] | undefined> {
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
    this.compareRequirementsWithSkills(equipment);
    const previousItem = equipmentSchema.safeParse(this.getInventoryItem(previousItems[0]));
    const equipmentItem = equipmentSchema.safeParse(equipment);
    if (previousItem.success) {
      previousItem.data.isEquipped = false;
      await this.setInventoryItem(previousItem.data);
    }

    if (equipmentItem.success) {
      equipmentItem.data.isEquipped = true;
      await this.setInventoryItem(equipmentItem.data);
    }

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
    this.compareRequirementsWithSkills(equipment);
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

  private compareRequirementsWithSkills(equipment: EquipmentItem | SpellItem) {
    const skills = skillsSchema
      .omit({ updated: true, created: true, id: true })
      .parse(this.character.expand.skills);
    const requirements = Object.entries(equipment).filter(
      (entry): entry is [keyof typeof skillsDictionary, number] =>
        entry[0] in skills && typeof entry[1] === "number"
    );

    const missingRequirements = requirements.filter(([key, value]) => skills[key] < value);
    if (missingRequirements.length) {
      const missingRequirementsString = missingRequirements
        .map(([key, value]) => `${skillsDictionary[key]}: ${value}`)
        .join(", ");

      throw new BotError(
        `Você não possui os requisitos necessários para equipar este item. Requisitos: ${missingRequirementsString}`
      );
    }
  }

  private getParsedItem(itemId: Item["id"]) {
    return consumableSchema
      .or(equipmentSchema)
      .or(spellSchema)
      .parse(this.getInventoryItem(itemId));
  }
}
