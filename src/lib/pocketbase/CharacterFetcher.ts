import type { Snowflake } from "discord.js";
import type { ListResult } from "pocketbase";

import { COLLECTIONS, RELATION_FIELD_NAMES } from "../../data/constants";
import characterSchema from "../../schemas/characterSchema";
import type {
  AllowedEntityTypes,
  Character,
  Faction,
  Memory,
  Player,
  Race,
  RelationFields,
  Skills,
  Status,
} from "../../types/Character";
import type { CreateData } from "../../types/PocketBaseCRUD";
import PocketBase from "./PocketBase";

export default class CharacterFetcher extends PocketBase {
  constructor() {
    super();
  }

  public async getAllCharacters(): Promise<Character[]> {
    const response = await this.pb.collection(COLLECTIONS.characters).getFullList<Character>();
    return response;
  }

  public async getAllMemories(): Promise<Memory[]> {
    const response = await this.pb.collection(COLLECTIONS.memories).getFullList<Memory>();
    return response;
  }
  public async getCharactersByPlayerId({
    page,
    playerId,
  }: {
    page: number;
    playerId: Snowflake;
  }): Promise<ListResult<Character>> {
    const response = await this.pb.collection(COLLECTIONS.characters).getList<Character>(page, 10, {
      filter: `playerId="${playerId}"`,
      ...PocketBase.expand(...Object.values(RELATION_FIELD_NAMES)),
    });

    return response;
  }

  public async getCharacterById(id: Character["id"]): Promise<Character> {
    const response = await this.getEntityById<Character>({
      entityType: "characters",
      id,
    });

    return response;
  }

  public async getPlayerById(playerId: Player["discordId"]): Promise<Player> {
    try {
      const response = await this.pb
        .collection(COLLECTIONS.players)
        .getFirstListItem<Player>(`playerId="${playerId}"`, PocketBase.expand("characters"));
      if (!response) {
        throw new Error("Player not found");
      }
      return response;
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }
      console.error(error.message);
      if (error.message !== "Player not found") {
        throw error;
      }
      const player = await this.createEntity<Player>({
        entityData: {
          discordId: playerId,
          characters: [],
          currentCharacterId: "",
        },
        entityType: "players",
      });
      if (!player) {
        throw new Error("Could not create player");
      }
      return player;
    }
  }

  public async getEntityById<T extends AllowedEntityTypes>({
    entityType,
    id,
    expandFields = false,
  }: {
    entityType: keyof typeof COLLECTIONS;
    expandFields?: boolean;
    id: string;
  }): Promise<T> {
    const response = await this.pb
      .collection(COLLECTIONS[entityType])
      .getOne<T>(
        id,
        expandFields ? PocketBase.expand(...Object.values(RELATION_FIELD_NAMES)) : undefined
      );

    return response;
  }

  public async deleteCharacter(userId: Snowflake, id: Character["id"]): Promise<void> {
    const { playerId: prevUserId } = await this.getEntityById<Character>({
      entityType: "characters",
      id,
    });

    if (!this.isOwner(userId, prevUserId)) {
      throw new Error("You cannot delete another user's character");
    }

    await this.pb.collection(COLLECTIONS.characters).delete(id);
  }

  public async createCharacter(
    skills: CreateData<Skills>,
    char: CreateData<Character>,
    playerId: Snowflake
  ): Promise<Character> {
    const baseSkills = await this.createEntity<Skills>({
      entityData: skills,
      entityType: "skills",
    });
    const baseStatus = await this.createEntity<Status>({
      entityData: {
        health: 100,
        money: 0,
        stamina: 100,
      },
      entityType: "status",
    });
    const playerToAddCharacter = await this.getPlayerById(playerId);
    const raceToAddCharacter = await this.getEntityById<Race>({
      entityType: "races",
      id: char.raceId,
    });
    const factionToAddCharacter = char.factionId
      ? await this.getEntityById<Faction>({
          entityType: "factions",
          id: char.factionId,
        })
      : null;
    const response = await this.pb.collection(COLLECTIONS.characters).create<Character>(
      {
        ...char,
        skills: baseSkills.id,
        status: baseStatus.id,
      },
      PocketBase.expand(...Object.values(RELATION_FIELD_NAMES))
    );

    await this.syncCharacterRelations({
      baseSkills,
      baseStatus,
      character: response,
      factionToAddCharacter,
      raceToAddCharacter,
      playerToAddCharacter,
    });
    return response;
  }

  public async createEntity<T extends RelationFields>({
    entityType,
    entityData,
  }: {
    entityData: CreateData<T>;
    entityType: keyof typeof COLLECTIONS;
  }): Promise<T> {
    const response = await this.pb.collection(COLLECTIONS[entityType]).create<T>(entityData);
    return response;
  }

  public async updateEntity<T extends RelationFields>(entity: T): Promise<T> {
    const {
      id,
      collectionId: _collectionId,
      collectionName: _collectionName,
      updated: _updated,
      created: _created,
      ...body
    } = entity;

    if (this.isCharacter(entity)) {
      const prevData = await PocketBase.validateRecord(entity, this.getCharacterById);

      if (!this.isOwner(entity.playerId, prevData.playerId)) {
        throw new Error("You are not the owner of this Character");
      }
    }

    return this.pb
      .collection(COLLECTIONS[entity.collectionName as keyof typeof COLLECTIONS])
      .update<T>(id, body);
  }

  private isCharacter(e: unknown): e is Character {
    return !!characterSchema.safeParse(e);
  }
  private isOwner(userId: Snowflake, prevUserId: Snowflake): boolean {
    return userId === prevUserId;
  }

  private async syncCharacterRelations({
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
    factionToAddCharacter: Faction | null;
    playerToAddCharacter: Player;
    raceToAddCharacter: Race;
  }) {
    if (factionToAddCharacter) {
      await this.updateEntity<Faction>({
        ...factionToAddCharacter,
        characters: [...factionToAddCharacter.characters, character.id],
      });
    }
    await this.updateEntity<Race>({
      ...raceToAddCharacter,
      characters: [...raceToAddCharacter.characters, character.id],
    });
    await this.updateEntity<Skills>({
      ...baseSkills,
      character: character.id,
    });
    await this.updateEntity<Status>({
      ...baseStatus,
      character: character.id,
    });
    await this.updateEntity<Player>({
      ...playerToAddCharacter,
      characters: [...playerToAddCharacter.characters, character.id],
    });
  }
}
