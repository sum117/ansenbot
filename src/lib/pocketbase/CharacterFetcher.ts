import assert from "assert";
import type { Snowflake } from "discord.js";
import type { ListResult, RecordFullListQueryParams } from "pocketbase";

import type { COLLECTIONS } from "../../data/constants";
import { RELATION_FIELD_NAMES } from "../../data/constants";
import type {
  Character,
  Faction,
  Player,
  Race,
  RelationFields,
  Skills,
  Spec,
  Status,
} from "../../types/Character";
import type { CreateData, PocketBaseConstants } from "../../types/PocketBaseCRUD";
import { BotError, PocketBaseError } from "../../utils/Errors";
import getSafeKeys from "../../utils/getSafeKeys";
import PlayerFetcher from "./PlayerFetcher";
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

  public static async createCharacter(
    char: CreateData<Character>,
    playerId: Snowflake
  ): Promise<Character | void> {
    try {
      char.level = 4;
      const [chosenSpec, secondChosenSpec] = await Promise.all(
        char.spec.map((spec) =>
          PocketBase.getEntityById<Spec>({
            entityType: "spec",
            id: spec,
            expandFields: true,
          })
        )
      );

      assert(chosenSpec.expand?.startingSkills, "Spec not found");
      const sanitizedStartingSkillsOne = this.sanitizeStartingSkills(
        chosenSpec.expand.startingSkills
      );

      const skills = this.sanitizeAndMergeStartingSkills(
        sanitizedStartingSkillsOne,
        secondChosenSpec.expand?.startingSkills
      );

      const baseSkills = await PocketBase.createEntity<Skills>({
        entityData: skills,
        entityType: "skills",
      });

      const baseStatus = await PocketBase.createEntity<Status>({
        entityData: {
          health: 100 + skills.vigor * 10,
          money: 0,
          stamina: 100 + skills.fortitude * 10,
        },
        entityType: "status",
      });

      const [playerToAddCharacter, raceToAddCharacter, factionToAddCharacter] = await Promise.all([
        PlayerFetcher.getPlayerById(playerId),
        PocketBase.getEntityById<Race>({
          entityType: "races",
          id: char.race,
        }),
        char.faction
          ? PocketBase.getEntityById<Faction>({
              entityType: "factions",
              id: char.faction,
            })
          : undefined,
      ]);

      if (!raceToAddCharacter || !playerToAddCharacter) {
        return;
      }

      const response = await PocketBase.createEntity<Character>({
        entityType: "characters",
        entityData: {
          ...char,
          skills: baseSkills.id,
          status: baseStatus.id,
        },
        expandFields: true,
      });

      await CharacterFetcher.syncCharacterRelations({
        baseSkills,
        baseStatus,
        character: response,
        factionToAddCharacter,
        raceToAddCharacter,
        playerToAddCharacter,
        specsToAddCharacter: [chosenSpec, secondChosenSpec].filter((spec) => !!spec),
      });
      return response;
    } catch (error) {
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
      expand: _expand,
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

  private static async syncCharacterRelations({
    factionToAddCharacter,
    raceToAddCharacter,
    playerToAddCharacter,
    specsToAddCharacter,
    character,
    baseSkills,
    baseStatus,
  }: {
    specsToAddCharacter: Spec[];
    baseSkills: Skills;
    baseStatus: Status;
    character: Character;
    factionToAddCharacter: Faction | undefined;
    playerToAddCharacter: Player;
    raceToAddCharacter: Race;
  }): Promise<boolean> {
    const updateTasks: Array<Promise<void>> = [
      this.updateEntityWithCharacter(raceToAddCharacter, character),
      this.updateEntityWithCharacter(baseSkills, character),
      this.updateEntityWithCharacter(baseStatus, character),
      this.updateEntityWithCharacter(playerToAddCharacter, character),
    ];

    if (factionToAddCharacter) {
      updateTasks.push(this.updateEntityWithCharacter(factionToAddCharacter, character));
    }

    for (const spec of specsToAddCharacter) {
      updateTasks.push(this.updateEntityWithCharacter(spec, character));
    }

    await Promise.all(updateTasks);
    return true;
  }

  private static async updateEntityWithCharacter<T extends RelationFields>(
    entity: T,
    character: Character
  ): Promise<void> {
    const entityType = entity.collectionName as keyof typeof COLLECTIONS;

    if ("character" in entity) {
      entity.character = character.id;
    } else if ("characters" in entity && Array.isArray(entity.characters)) {
      entity.characters = [...entity.characters, character.id];
    }

    await PocketBase.updateEntity<T>({
      entityType,
      entityData: entity,
    });
  }
}
