import type { Snowflake } from "discord.js";
import type { ListResult } from "pocketbase";

import type {
  Character,
  CreateData,
  Faction,
  Race,
  Skills,
  Status,
} from "../../../types";
import { PocketBase } from "../";
import { COLLECTIONS, RELATION_FIELD_NAMES } from "../constants";

export class CharacterFetcher extends PocketBase {
  constructor() {
    super();
  }

  public async getAllCharacters(): Promise<Character[]> {
    const response = await this.pb
      .collection(COLLECTIONS.characters)
      .getFullList<Character>();
    return response;
  }

  public async getCharactersByUserId({
    page,
    userId,
  }: {
    page: number;
    userId: Snowflake;
  }): Promise<ListResult<Character>> {
    const response = await this.pb
      .collection(COLLECTIONS.characters)
      .getList<Character>(page, 10, {
        filter: `userId="${userId}"`,
        ...PocketBase.expand(...Object.values(RELATION_FIELD_NAMES)),
      });

    return response;
  }

  // TODO: Update Validate Record so this code can be removed as getEntityById already does this
  public async getCharacterById(id: Character["id"]): Promise<Character> {
    const response = await this.pb
      .collection(COLLECTIONS.characters)
      .getOne<Character>(id);

    return response;
  }

  public async getEntityById<T>({
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
        expandFields
          ? PocketBase.expand(...Object.values(RELATION_FIELD_NAMES))
          : undefined
      );

    return response;
  }

  public async deleteCharacter(
    userId: Snowflake,
    id: Character["id"]
  ): Promise<void> {
    const { userId: prevUserId } = await this.getEntityById<Character>({
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
    char: CreateData<Character>
  ): Promise<Character> {
    const baseSkills = await this.createBaseSkills(skills);
    const baseStatus = await this.createBaseStatus({
      health: 100,
      money: 100,
      stamina: 100,
    });
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
    const response = await this.pb
      .collection(COLLECTIONS.characters)
      .create<Character>(
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
    });
    return response;
  }

  public async createBaseSkills(skills: CreateData<Skills>): Promise<Skills> {
    const response = await this.pb
      .collection(COLLECTIONS.skills)
      .create<Skills>(skills);

    return response;
  }

  public async createBaseStatus(status: CreateData<Status>): Promise<Status> {
    const response = await this.pb
      .collection(COLLECTIONS.status)
      .create<Status>(status);

    return response;
  }

  public async updateEntity<T>(
    entityType: keyof typeof COLLECTIONS,
    entity: T
  ): Promise<T> {
    const {
      id,
      collectionId: _collectionId,
      collectionName: _collectionName,
      updated: _updated,
      created: _created,
      ...body
    } = entity as any;

    if (entityType === "characters") {
      const prevData = await PocketBase.validateRecord(
        entity as Character,
        // TODO: Update this to be able to use this.getEntityById
        this.getCharacterById
      );

      if (!this.isOwner((entity as Character).userId, prevData.userId)) {
        throw new Error("You are not the owner of this Character");
      }
    }

    return this.pb.collection(COLLECTIONS[entityType]).update<T>(id, body);
  }

  private isOwner(userId: Snowflake, prevUserId: Snowflake): boolean {
    return userId === prevUserId;
  }

  private async syncCharacterRelations({
    factionToAddCharacter,
    raceToAddCharacter,
    character,
    baseSkills,
    baseStatus,
  }: {
    baseSkills: Skills;
    baseStatus: Status;
    character: Character;
    factionToAddCharacter: Faction | null;
    raceToAddCharacter: Race;
  }) {
    if (factionToAddCharacter) {
      await this.updateEntity<Faction>("factions", {
        ...factionToAddCharacter,
        characters: [...factionToAddCharacter.characters, character.id],
      });
    }
    await this.updateEntity<Race>("races", {
      ...raceToAddCharacter,
      characters: [...raceToAddCharacter.characters, character.id],
    });
    await this.updateEntity<Skills>("skills", {
      ...baseSkills,
      character: character.id,
    });
    await this.updateEntity<Status>("status", {
      ...baseStatus,
      character: character.id,
    });
  }
}
