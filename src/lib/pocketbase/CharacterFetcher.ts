import type { Snowflake } from "discord.js";
import type { ListResult, RecordFullListQueryParams } from "pocketbase";

import { RELATION_FIELD_NAMES } from "../../data/constants";
import type { Character, Faction, Player, Race, Skills, Status } from "../../types/Character";
import type { CreateData } from "../../types/PocketBaseCRUD";
import { BotError, PocketBaseError } from "../../utils/Errors";
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
        const response = await PocketBase.getAllEntities<Character>({
          entityType: "characters",
        });

        return response;
      }
      const response = await PocketBase.getEntitiesByFilter<Character>({
        entityType: "characters",
        filter: [1, 24, filter],
      });
      return response;
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
      const response = await PocketBase.getEntitiesByFilter<Character>({
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
      return response;
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
      const response = await PocketBase.getEntitiesByFilter<Character>({
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

      return response;
    } catch (error) {
      throw new PocketBaseError("Could not get characters by player id.");
    }
  }

  public static async getCharacterById(id: Character["id"]): Promise<Character> {
    try {
      const response = await PocketBase.getEntityById<Character>({
        entityType: "characters",
        id,
      });

      return response;
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
        throw new BotError("Character not found");
      }
      if (!this.isOwner(userId, character.playerId)) {
        throw new BotError("You cannot delete another user's character");
      }

      await PocketBase.deleteEntity({ entityType: "characters", id });
    } catch (error) {
      throw new PocketBaseError("Could not delete character.");
    }
  }

  public static async createCharacter(
    skills: CreateData<Skills>,
    char: CreateData<Character>,
    playerId: Snowflake
  ): Promise<Character> {
    try {
      const baseSkills = await PocketBase.createEntity<Skills>({
        entityData: skills,
        entityType: "skills",
      });
      const baseStatus = await PocketBase.createEntity<Status>({
        entityData: {
          health: 100,
          money: 0,
          stamina: 100,
        },
        entityType: "status",
      });

      const playerToAddCharacter = await PlayerFetcher.getPlayerById(playerId);
      const raceToAddCharacter = await PocketBase.getEntityById<Race>({
        entityType: "races",
        id: char.race,
      });

      const factionToAddCharacter = char.faction
        ? await PocketBase.getEntityById<Faction>({
            entityType: "factions",
            id: char.faction,
          })
        : undefined;

      if (!raceToAddCharacter || !playerToAddCharacter) {
        throw new BotError("Could not create character");
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
      });
      return response;
    } catch (error) {
      throw new PocketBaseError("Could not create character.");
    }
  }

  private static isOwner(userId: Snowflake, prevUserId: Snowflake): boolean {
    return userId === prevUserId;
  }

  private static async syncCharacterRelations({
    factionToAddCharacter,
    raceToAddCharacter,
    playerToAddCharacter,
    character,
    baseSkills,
    baseStatus,
  }: {
    baseSkills: Skills;
    baseStatus: Status;
    character: Character;
    factionToAddCharacter: Faction | undefined;
    playerToAddCharacter: Player;
    raceToAddCharacter: Race;
  }): Promise<boolean> {
    if (factionToAddCharacter) {
      await PocketBase.updateEntity<Faction>({
        entityType: "factions",
        entityData: {
          ...factionToAddCharacter,
          characters: [...factionToAddCharacter.characters, character.id],
        },
      });
    }
    await PocketBase.updateEntity<Race>({
      entityType: "races",
      entityData: {
        ...raceToAddCharacter,
        characters: [...raceToAddCharacter.characters, character.id],
      },
    });
    await PocketBase.updateEntity<Skills>({
      entityType: "skills",
      entityData: { ...baseSkills, character: character.id },
    });
    await PocketBase.updateEntity<Status>({
      entityType: "status",
      entityData: {
        ...baseStatus,
        character: character.id,
      },
    });
    await PocketBase.updateEntity<Player>({
      entityType: "players",
      entityData: {
        ...playerToAddCharacter,
        characters: [...playerToAddCharacter.characters, character.id],
      },
    });
    return true;
  }
}
