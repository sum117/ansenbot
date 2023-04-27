import assert from "assert";
import type { Snowflake } from "discord.js";
import type { ListResult, RecordFullListQueryParams } from "pocketbase";
import type {
  Character,
  CharacterBody,
  DestinyMaiden,
  Faction,
  Player,
  Race,
  Skills,
  Spec,
  Status,
} from "../../types/Character";
import type { COLLECTIONS } from "../../data/constants";
import { RELATION_FIELD_NAMES } from "../../data/constants";
import type { Collection } from "../../types/Collection";
import type { CreateData, PocketBaseConstants } from "../../types/PocketBaseCRUD";
import { BotError, PocketBaseError } from "../../utils/Errors";
import getSafeKeys from "../../utils/getSafeKeys";
import PlayerFetcher from "./PlayerFetcher";
import PocketBase from "./PocketBase";
import jsonToFormData from "../../utils/jsonToFormData";
import getImageBlob from "../../utils/getImageBlob";
import { inspect } from "util";

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

  public static async updateCharacter(character: Character): Promise<Character> {
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

  public static async createCharacter(
    char: CreateData<Character>,
    playerId: Snowflake
  ): Promise<Character | void> {
    try {
      const [chosenSpec, secondChosenSpec, chosenRace, secondChosenRace] = (await Promise.all([
        ...char.spec.map((spec) =>
          PocketBase.getEntityById<Spec>({
            entityType: "spec",
            id: spec,
            expandFields: true,
          })
        ),
        ...char.race.map((race) =>
          PocketBase.getEntityById<Race>({
            entityType: "races",
            id: race,
            expandFields: true,
          })
        ),
      ])) as [Spec, Spec, Race, Race];

      assert(chosenSpec.expand?.startingSkills, "Spec not found");
      const sanitizedStartingSkillsOne = this.sanitizeStartingSkills(
        chosenSpec.expand.startingSkills
      );

      const skills = this.sanitizeAndMergeStartingSkills(
        sanitizedStartingSkillsOne,
        secondChosenSpec.expand?.startingSkills
      );

      const [baseSkills, baseStatus, body] = await Promise.all([
        PocketBase.createEntity<Skills>({
          entityData: skills,
          entityType: "skills",
        }),
        PocketBase.createEntity<Status>({
          entityData: {
            health: 100 + skills.vigor * 10,
            spirit: 100,
            stamina: 100 + skills.fortitude * 10,
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
            shoulders: "",
          },
          entityType: "body",
        }),
      ]);

      const [playerToAddCharacter, factionToAddCharacter, maidenToAddCharacter] = await Promise.all(
        [
          PlayerFetcher.getPlayerById(playerId),

          char.faction
            ? PocketBase.getEntityById<Faction>({
                entityType: "factions",
                id: char.faction,
              })
            : undefined,
          PocketBase.getEntityById<DestinyMaiden>({
            entityType: "destinyMaidens",
            id: char.destinyMaiden,
          }),
        ]
      );

      if (!playerToAddCharacter) {
        return;
      }
      const { blob, fileName } = await getImageBlob(char.image);
      const formData = jsonToFormData({
        ...char,
        skills: baseSkills.id,
        status: baseStatus.id,
        body: body.id,
      });
      formData.set("image", blob, fileName);
      const response = await PocketBase.createEntityWithFormData<Character>("characters", formData);
      await CharacterFetcher.syncCharacterRelations({
        baseSkills,
        body,
        baseStatus,
        character: response,
        factionToAddCharacter,
        racesToAddCharacter: [chosenRace, secondChosenRace].filter((race) => !!race),
        playerToAddCharacter,
        maidenToAddCharacter,
        specsToAddCharacter: [chosenSpec, secondChosenSpec].filter((spec) => !!spec),
      });
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
    racesToAddCharacter,
    playerToAddCharacter,
    specsToAddCharacter,
    maidenToAddCharacter,
    character,
    baseSkills,
    baseStatus,
    body,
  }: {
    specsToAddCharacter: Spec[];
    baseSkills: Skills;
    body: CharacterBody;
    baseStatus: Status;
    character: Character;
    factionToAddCharacter: Faction | undefined;
    playerToAddCharacter: Player;
    maidenToAddCharacter: DestinyMaiden;
    racesToAddCharacter: Race[];
  }): Promise<boolean> {
    const updateTasks: Array<Promise<void>> = [
      this.updateEntityWithCharacter(baseSkills, character),
      this.updateEntityWithCharacter(baseStatus, character),
      this.updateEntityWithCharacter(body, character),
      this.updateEntityWithCharacter(playerToAddCharacter, character),
      this.updateEntityWithCharacter(maidenToAddCharacter, character),
    ];

    if (factionToAddCharacter) {
      updateTasks.push(this.updateEntityWithCharacter(factionToAddCharacter, character));
    }

    for (const spec of specsToAddCharacter) {
      updateTasks.push(this.updateEntityWithCharacter(spec, character));
    }

    for (const race of racesToAddCharacter) {
      updateTasks.push(this.updateEntityWithCharacter(race, character));
    }

    await Promise.all(updateTasks);
    return true;
  }

  private static async updateEntityWithCharacter<T extends Collection>(
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
