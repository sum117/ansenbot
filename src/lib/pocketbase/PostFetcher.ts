import type { Message } from "discord.js";

import type { Character, Player, Post } from "../../types/Character";
import safePromise from "../../utils/safePromise";
import CharacterFetcher from "./CharacterFetcher";
import PlayerFetcher from "./PlayerFetcher";
import PocketBase from "./PocketBase";

export default class PostFetcher {
  public static async createPost<T extends Message>(message: T): Promise<Post | void> {
    const [postPlayer, postPlayerError] = await safePromise(
      PlayerFetcher.getPlayerById(message.author.id)
    );
    if (postPlayerError) {
      console.error("Could not find player for post creation: ", postPlayerError);
      void message.reply(
        "Não foi possível encontrar o jogador para a criação do post: Erro Interno"
      );
      return;
    }
    const [postCharacter, postCharacterError] = await safePromise(
      CharacterFetcher.getCharacterById(postPlayer.currentCharacterId)
    );

    if (postCharacterError) {
      console.error("Could not find character for post creation: ", postCharacterError);
      void message.reply(
        "Não foi possível encontrar o personagem para a criação do post: Erro Interno"
      );
      return;
    }

    const [createdPost, createPostError] = await safePromise(
      PocketBase.createEntity<Post>({
        entityData: {
          character: postCharacter.id,
          player: postPlayer.id,
          content: message.content,
          messageId: message.id,
        },
        entityType: "posts",
      })
    );

    if (createPostError) {
      console.error("Could not create post: ", createPostError);
      void message.reply("Não foi possível criar o post: Erro Interno");
      return;
    }

    const [_syncPostRelations, syncPostRelationsError] = await safePromise(
      this.syncPostRelations({
        characterToAddPost: postCharacter,
        playerToAddPost: postPlayer,
        post: createdPost,
      })
    );
    if (syncPostRelationsError) {
      console.error("Could not sync post relations: ", syncPostRelationsError);
      void message.reply("Não foi possível sincronizar as relações do post: Erro Interno");
      return;
    }
    return createdPost;
  }

  public static async deletePost<T extends Message>(message: T): Promise<void> {
    const [post, postError] = await safePromise(
      PocketBase.getFirstListEntity<Post>({
        entityType: "posts",
        filter: [`messageId="${message.id}"`, {}],
      })
    );
    if (postError) {
      console.error("Could not find post to delete: ", postError);
      return;
    }

    const [_deletedPost, deletedPostError] = await safePromise(
      PocketBase.deleteEntity({
        entityType: "posts",
        id: post.id,
      })
    );

    if (deletedPostError) {
      console.error("Could not delete post: ", deletedPostError);
      return;
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
    try {
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
    } catch (e) {
      console.error("Error while syncing post relations", e);
      return false;
    }
  }
}
