import type { Message, Snowflake } from "discord.js";
import type { ListResult, RecordFullListQueryParams } from "pocketbase";

import { COLLECTIONS, RELATION_FIELD_NAMES } from "../../data/constants";
import characterSchema from "../../schemas/characterSchema";
import type {
  Character,
  Faction,
  Memory,
  Player,
  Post,
  Race,
  RelationFields,
  Skills,
  Status,
} from "../../types/Character";
import type { CreateData } from "../../types/PocketBaseCRUD";
import safePromise from "../../utils/safePromise";
import PocketBase from "./PocketBase";

export default class CharacterFetcher extends PocketBase {
  constructor() {
    super();
  }

  private async findPlayerOrThrow(playerId: Player["discordId"]): Promise<Player> {
    const response = await this.pb
      .collection(COLLECTIONS.players)
      .getFirstListItem<Player>(`discordId="${playerId}"`, PocketBase.expand("characters"))
      .catch(() => {
        throw new Error("Player not found");
      });
    return response;
  }

  private async createPlayer(playerId: Player["discordId"]): Promise<Player> {
    const player = await this.createEntity<Player>({
      entityData: {
        discordId: playerId,
        characters: [],
        currentCharacterId: "",
        posts: [],
      },
      entityType: "players",
    });
    if (!player) {
      throw new Error("Could not create player");
    }
    return player;
  }

  public getPlayerById(playerId: Player["discordId"]): Promise<Player> {
    try {
      return this.findPlayerOrThrow(playerId);
    } catch (error) {
      if (error instanceof Error && error.message === "Player not found") {
        return this.createPlayer(playerId);
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

  public async getAllCharacters(queryParams?: RecordFullListQueryParams): Promise<Character[]> {
    const response = await this.pb
      .collection(COLLECTIONS.characters)
      .getFullList<Character>(queryParams);
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
      id: char.race,
    });

    const factionToAddCharacter = char.faction
      ? await this.getEntityById<Faction>({
          entityType: "factions",
          id: char.faction,
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
  public async createPost<T extends Message, R>(message: T): Promise<R | void> {
    const [postPlayer, postPlayerError] = await safePromise(this.getPlayerById(message.author.id));
    if (postPlayerError || !postPlayer?.currentCharacterId) {
      void message.reply(
        "Não foi possível encontrar o jogador para a criação do post: Erro Interno"
      );
      return;
    }
    const [postCharacter, postCharacterError] = await safePromise(
      this.getCharacterById(postPlayer.currentCharacterId)
    );

    if (postCharacterError || !postCharacter) {
      void message.reply(
        "Não foi possível encontrar o personagem para a criação do post: Erro Interno"
      );
      return;
    }

    // criar o post e relacionar com o personagem e com o jogador

    const post = await this.createEntity<Post>({
      entityData: {
        character: postCharacter.id,
        player: postPlayer.id,
        content: message.content,
        messageId: message.id,
      },
      entityType: "posts",
    });
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

  public async getEntityById<T extends RelationFields>({
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
  private async syncPostRelations({
    characterToAddPost,
    playerToAddPost,
    post,
  }: {
    characterToAddPost: Character;
    playerToAddPost: Player;
    post: Post;
  }): Promise<boolean> {
    try {
      await this.updateEntity<Character>({
        ...characterToAddPost,
        posts: [...characterToAddPost.posts, post.id],
      });
      await this.updateEntity<Player>({
        ...playerToAddPost,
        posts: [...playerToAddPost.posts, post.id],
      });
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
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
  }): Promise<boolean> {
    try {
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
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }
}
