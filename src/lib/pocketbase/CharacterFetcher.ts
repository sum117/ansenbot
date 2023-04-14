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

  public async getPlayerById(playerId: Player["discordId"]): Promise<Player> {
    try {
      const response = await this.pb
        .collection(COLLECTIONS.players)
        .getFirstListItem<Player>(`discordId="${playerId}"`, PocketBase.expand("characters"))
        .catch(() => {
          throw new Error("Player not found");
        });
      return response;
    } catch (error) {
      if (error instanceof Error && error.message === "Player not found") {
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
      throw error;
    }
  }

  public async getFirstCharacterCreateDate(): Promise<Date> {
    const response = await this.pb
      .collection(COLLECTIONS.characters)
      .getFirstListItem<Character>("", {
        sort: "created",
      });
    if (!response) {
      throw new Error("No characters found");
    }
    return new Date(response.created);
  }

  public async getAllCharacters(): Promise<Character[]> {
    const response = await this.pb.collection(COLLECTIONS.characters).getFullList<Character>();
    return response;
  }
  public async getAllCharactersFromPlayer(playerId: Snowflake): Promise<Character[]> {
    const response = await this.pb.collection(COLLECTIONS.characters).getFullList<Character>({
      filter: `playerId="${playerId}"`,
    });
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
      expandFields: true,
    });
    if (!response) {
      throw new Error("Character not found");
    }
    return response;
  }

  public async deleteCharacter(userId: Snowflake, id: Character["id"]): Promise<void> {
    const character = await this.getEntityById<Character>({
      entityType: "characters",
      id,
    });

    if (!character) {
      throw new Error("Character not found");
    }

    if (!this.isOwner(userId, character.playerId)) {
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
      : undefined;

    if (!raceToAddCharacter || !playerToAddCharacter) {
      throw new Error("Could not create character");
    }

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
      const prevData = await PocketBase.validateRecord(entity, this.getCharacterById.bind(this));

      if (!this.isOwner(entity.playerId, prevData.playerId)) {
        throw new Error("You are not the owner of this Character");
      }
    }

    return this.pb
      .collection(COLLECTIONS[entity.collectionName as keyof typeof COLLECTIONS])
      .update<T>(id, body);
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
    if (!id) {
      throw new Error("No id provided ");
    }
    const response = await this.pb
      .collection(COLLECTIONS[entityType])
      .getOne<T>(
        id,
        expandFields ? PocketBase.expand(...Object.values(RELATION_FIELD_NAMES)) : undefined
      );

    return response;
  }
  private isCharacter(e: unknown): e is Character {
    const safeParse = characterSchema.safeParse(e);
    return safeParse.success;
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
    factionToAddCharacter: Faction | undefined;
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
