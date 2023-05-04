import assert from "assert";
import type { Snowflake } from "discord.js";
import type { ListResult, RecordFullListQueryParams } from "pocketbase";
import { inspect } from "util";

import { RELATION_FIELD_NAMES, STATUS_GAIN_PER_LEVEL } from "../../data/constants";
import type { Character, CharacterBody, Inventory, Skills, Status } from "../../types/Character";
import type { CreateData, PocketBaseConstants } from "../../types/PocketBaseCRUD";
import { BotError, PocketBaseError } from "../../utils/Errors";
import getImageBlob from "../../utils/getImageBlob";
import getSafeKeys from "../../utils/getSafeKeys";
import jsonToFormData from "../../utils/jsonToFormData";
import PocketBase from "./PocketBase";

export default class CharacterFetcher {
  public static async getFirstCharacterCreateDate(): Promise<Date> {
    try {
      const response = await PocketBase.getFirstListEntity({
        entityType: "characters",
        filter: [
          "",
          {
            sort: "created",
          },
        ],
      });

      return new Date(response.created);
    } catch (error) {
      throw new PocketBaseError("Could not get first character created date.");
    }
  }

  public static async getAllCharacters({
    filter,
  }: {
    filter?: RecordFullListQueryParams;
  }): Promise<ListResult<Character>> {
    try {
      if (!filter) {
        return await PocketBase.getAllEntities<Character>({
          entityType: "characters",
        });
      }
      return await PocketBase.getEntitiesByFilter<Character>({
        entityType: "characters",
        filter: [1, 24, filter],
      });
    } catch (error) {
      throw new PocketBaseError("Could not get all characters.");
    }
  }

  public static async getCharactersByUserId({
    page,
    userId,
  }: {
    page: number;
    userId: Snowflake;
  }): Promise<ListResult<Character>> {
    try {
      return await PocketBase.getEntitiesByFilter<Character>({
        entityType: "characters",
        filter: [
          page,
          10,
          {
            filter: `userId="${userId}"`,
            ...PocketBase.expand(...Object.values(RELATION_FIELD_NAMES)),
          },
        ],
      });
    } catch (error) {
      throw new PocketBaseError("Could not get characters by user id.");
    }
  }

  public static async getCharactersByPlayerId({
    page,
    playerId,
  }: {
    page: number;
    playerId: Snowflake;
  }): Promise<ListResult<Character>> {
    try {
      return await PocketBase.getEntitiesByFilter<Character>({
        entityType: "characters",
        filter: [
          page,
          10,
          {
            filter: `playerId="${playerId}"`,
            ...PocketBase.expand(...Object.values(RELATION_FIELD_NAMES)),
          },
        ],
      });
    } catch (error) {
      throw new PocketBaseError("Could not get characters by player id.");
    }
  }

  public static async getCharacterById(id: Character["id"]): Promise<Character> {
    try {
      return await PocketBase.getEntityById<Character>({
        entityType: "characters",
        id,
      });
    } catch (error) {
      throw new PocketBaseError("Could not get character by id.");
    }
  }

  public static updateCharacter(character: Character): Promise<Character> {
    return PocketBase.updateEntity<Character>({
      entityType: "characters",
      entityData: character,
    });
  }

  public static async deleteCharacter(userId: Snowflake, id: Character["id"]): Promise<void> {
    try {
      const character = await PocketBase.getEntityById<Character>({
        entityType: "characters",
        id,
      });

      if (!character) {
        return;
      }
      if (!this.isOwner(userId, character.playerId)) {
        return;
      }

      await PocketBase.deleteEntity({ entityType: "characters", id });
    } catch (error) {
      throw new PocketBaseError("Could not delete character.");
    }
  }

  public static async createCharacter(char: CreateData<Character>): Promise<Character | void> {
    try {
      const specOne = char.specs[0];
      const specTwo = char.specs[1] ?? specOne;
      const startingSkills = await PocketBase.getEntitiesByFilter<Skills>({
        entityType: "startingSkills",
        filter: [
          1,
          2,
          {
            filter: `spec="${specOne} || spec="${specTwo}"`,
          },
        ],
      });

      assert(startingSkills.items[0], "starting skills for spec not found");

      const sanitizedStartingSkillsOne = this.sanitizeStartingSkills(startingSkills.items[0]);

      const skills = this.sanitizeAndMergeStartingSkills(
        sanitizedStartingSkillsOne,
        startingSkills.items[1]
      );

      const [baseSkills, baseStatus, body] = await Promise.all([
        PocketBase.createEntity<Skills>({
          entityData: skills,
          entityType: "skills",
        }),
        PocketBase.createEntity<Status>({
          entityData: {
            health: 100 + skills.vigor * STATUS_GAIN_PER_LEVEL,
            spirit: 100,
            mana: 100 + skills.intelligence * STATUS_GAIN_PER_LEVEL,
            stamina: 100 + skills.fortitude * STATUS_GAIN_PER_LEVEL,
            despair: 100,
            hunger: 100,
            void: 100,
            sleep: 100,
            effects: [],
            immune: [],
          },
          entityType: "status",
        }),
        PocketBase.createEntity<CharacterBody>({
          entityData: {
            head: "",
            legs: "",
            character: "",
            amulet: "",
            back: "",
            chest: "",
            face: "",
            feet: "",
            leftArm: "",
            rightArm: "",
            rings: [],
            spells: [],
            shoulders: "",
          },
          entityType: "body",
        }),
        PocketBase.createEntity<Inventory>({
          entityData: {
            consumables: [],
            equipments: [],
            spells: [],
          },
          entityType: "inventory",
        }),
      ]);

      const { blob, fileName } = await getImageBlob(char.image);
      const formData = jsonToFormData({
        ...char,
        skills: baseSkills.id,
        status: baseStatus.id,
        body: body.id,
      });
      formData.set("image", blob, fileName);
      const response = await PocketBase.createEntityWithFormData<Character>("characters", formData);

      return response;
    } catch (error) {
      console.error(inspect(error, false, null, true));
      throw new PocketBaseError("Could not create character.");
    }
  }

  public static isOwner(userId: Snowflake, prevUserId: Snowflake): boolean {
    return userId === prevUserId;
  }

  private static sanitizeStartingSkills(
    startingSkills: Omit<Skills, "expand">
  ): Omit<Skills, "expand" | "character" | keyof PocketBaseConstants> {
    const {
      spec: _spec,
      id: _id,
      created: _created,
      updated: _updated,
      collectionName: _collectionName,
      collectionId: _collectionId,
      ...sanitizedStartingSkills
    } = startingSkills as Omit<Skills, "character"> & { spec: string };

    return sanitizedStartingSkills;
  }

  private static sanitizeAndMergeStartingSkills(
    startingSkillsOne: Omit<Skills, "expand" | "character" | keyof PocketBaseConstants>,
    startingSkillsTwo?: Omit<Skills, "expand">
  ): Omit<Skills, "expand" | "character" | keyof PocketBaseConstants> {
    if (startingSkillsTwo) {
      const sanitizedStartingSkillsTwo = this.sanitizeStartingSkills(startingSkillsTwo);
      const mergedSkills = {
        ...startingSkillsOne,
        ...sanitizedStartingSkillsTwo,
      };

      getSafeKeys(mergedSkills).forEach((key) => {
        assert(mergedSkills, new BotError("Skills should be defined here"));
        const value = mergedSkills[key] ?? 0;
        mergedSkills[key] = Math.floor(value / 2);
      });

      return mergedSkills;
    } else {
      return startingSkillsOne;
    }
  }
}
