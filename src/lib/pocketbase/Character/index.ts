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
import { RELATION_FIELD_NAMES } from "../constants";

export class CharacterFetcher {
  public async getAllCharacters(): Promise<Character[]> {
    const response = await PocketBase.getAllEntities<Character>({
      entityType: "characters",
    });
    return response;
  }

  public async getCharactersByUserId({
    page,
    userId,
  }: {
    page: number;
    userId: Snowflake;
  }): Promise<ListResult<Character>> {
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
  }

  public async getCharacterById(id: Character["id"]): Promise<Character> {
    const response = await PocketBase.getEntityById<Character>({
      entityType: "characters",
      id,
    });

    return response;
  }

  public async deleteCharacter(
    userId: Snowflake,
    id: Character["id"]
  ): Promise<void> {
    const { userId: prevUserId } = await PocketBase.getEntityById<Character>({
      entityType: "characters",
      id,
    });

    if (!this.isOwner(userId, prevUserId)) {
      throw new Error("You cannot delete another user's character");
    }

    await PocketBase.deleteEntity({ entityType: "characters", id });
  }

  public async createCharacter(
    skills: CreateData<Skills>,
    char: CreateData<Character>
  ): Promise<Character> {
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

    const raceToAddCharacter = await PocketBase.getEntityById<Race>({
      entityType: "races",
      id: char.raceId,
    });

    const factionToAddCharacter = char.factionId
      ? await PocketBase.getEntityById<Faction>({
          entityType: "factions",
          id: char.factionId,
        })
      : null;

    const response = await PocketBase.createEntity<Character>({
      entityType: "characters",
      entityData: {
        ...char,
        skills: baseSkills.id,
        status: baseStatus.id,
      },
      expandFields: true,
    });

    await this.syncCharacterRelations({
      baseSkills,
      baseStatus,
      character: response,
      factionToAddCharacter,
      raceToAddCharacter,
    });
    return response;
  }

  public async updateCharacter({ character }: { character: Character }) {
    const prevData = await PocketBase.validateRecord(
      character,
      this.getCharacterById
    );

    if (!this.isOwner(character.userId, prevData.userId)) {
      throw new Error("You are not the owner of this Character");
    }

    const response = await PocketBase.updateEntity<Character>({
      entityData: character,
      entityType: "characters",
    });

    return response;
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
      entityData: {
        ...baseSkills,
        character: character.id,
      },
    });

    await PocketBase.updateEntity<Status>({
      entityType: "status",
      entityData: {
        ...baseStatus,
        character: character.id,
      },
    });
  }
}
