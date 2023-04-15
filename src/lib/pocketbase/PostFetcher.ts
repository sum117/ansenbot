import type { Message } from "discord.js";

import type { Character, Player, Post } from "../../types/Character";
import { PocketBaseError } from "../../utils/Errors";
import CharacterFetcher from "./CharacterFetcher";
import PlayerFetcher from "./PlayerFetcher";
import PocketBase from "./PocketBase";

export default class PostFetcher {
  public static getPostByMessageId(messageId: string): Promise<Post> {
    try {
      return PocketBase.getFirstListEntity({
        entityType: "posts",
        filter: [`messageId="${messageId}"`, {}],
      });
    } catch (error) {
      throw new PocketBaseError("Could not get post by message id.");
    }
  }

  public static async createPost<T extends Message>(message: T): Promise<Post | void> {
    try {
      const postPlayer = await PlayerFetcher.getPlayerById(message.author.id);
      const postCharacter = await CharacterFetcher.getCharacterById(postPlayer.currentCharacterId);
      const createdPost = await PocketBase.createEntity<Post>({
        entityData: {
          character: postCharacter.id,
          player: postPlayer.id,
          content: message.content,
          messageId: message.id,
        },
        entityType: "posts",
      });
      await this.syncPostRelations({
        characterToAddPost: postCharacter,
        playerToAddPost: postPlayer,
        post: createdPost,
      });
    } catch (error) {
      throw new PocketBaseError("Could not create post.");
    }
  }

  public static async deletePost<T extends Message>(message: T): Promise<void> {
    try {
      const post = await PocketBase.getFirstListEntity<Post>({
        entityType: "posts",
        filter: [`messageId="${message.id}"`, {}],
      });

      await PocketBase.deleteEntity({
        entityType: "posts",
        id: post.id,
      });
    } catch (error) {
      throw new PocketBaseError("Could not delete post.");
    }
  }

  private static async syncPostRelations({
    characterToAddPost,
    playerToAddPost,
    post,
  }: {
    characterToAddPost: Character;
    playerToAddPost: Player;
    post: Post;
  }): Promise<boolean> {
    await PocketBase.updateEntity<Character>({
      entityType: "characters",
      entityData: {
        ...characterToAddPost,
        posts: [...characterToAddPost.posts, post.id],
      },
    });
    await PocketBase.updateEntity<Player>({
      entityType: "players",
      entityData: {
        ...playerToAddPost,
        posts: [...playerToAddPost.posts, post.id],
      },
    });
    return true;
  }
}
