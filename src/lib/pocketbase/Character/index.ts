import type { Snowflake } from "discord.js";
import type { ListResult } from "pocketbase";

import type { CharacterData, CreateCharacterData } from "../../../types";
import { PocketBase } from "../";
import { COLLECTIONS } from "../constants";

export class CharacterFetcher extends PocketBase {
  constructor() {
    super();
  }

  public async getAllCharacters(): Promise<CharacterData[]> {
    const response = await this.pb
      .collection(COLLECTIONS.characters)
      .getFullList<CharacterData>();
    return response;
  }

  public async getCharactersByUserId({
    page,
    userId,
  }: {
    page: number;
    userId: Snowflake;
  }): Promise<ListResult<CharacterData>> {
    const response = await this.pb
      .collection(COLLECTIONS.characters)
      .getList<CharacterData>(page, 10, {
        filter: `userId="${userId}"`,
      });

    return response;
  }

  public async getCharacterById(
    id: CharacterData["id"]
  ): Promise<CharacterData> {
    const response = await this.pb
      .collection(COLLECTIONS.characters)
      .getOne<CharacterData>(id);

    return response;
  }

  public async deleteCharacter(
    userId: Snowflake,
    id: CharacterData["id"]
  ): Promise<void> {
    const { userId: prevUserId } = await this.getCharacterById(id);

    if (!this.isOwner(userId, prevUserId)) {
      throw new Error("You cannot delete another user's character");
    }

    await this.pb.collection(COLLECTIONS.characters).delete(id);
  }

  public async createCharacter(
    char: CreateCharacterData
  ): Promise<CharacterData> {
    const response = await this.pb
      .collection(COLLECTIONS.characters)
      .create<CharacterData>(char);

    return response;
  }

  public async updateCharacter(char: CharacterData): Promise<CharacterData> {
    const {
      id,
      collectionId: _collectionId,
      collectionName: _collectionName,
      updated: _updated,
      created: _created,
      userId,
      ...body
    } = char;

    const prevData = await PocketBase.validateRecord(
      char,
      this.getCharacterById
    );

    if (!this.isOwner(userId, prevData.userId)) {
      throw new Error("You are not the owner of this Character");
    }

    const response = await this.pb
      .collection(COLLECTIONS.characters)
      .update<CharacterData>(id, body, PocketBase.expand("skills", "status"));

    return response;
  }

  private isOwner(userId: Snowflake, prevUserId: Snowflake): boolean {
    return userId === prevUserId;
  }
}
