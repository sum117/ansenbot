import type { Message } from "discord.js";

import type { Character, Player, Post } from "../../types/Character";
import safePromise from "../../utils/safePromise";
import CharacterFetcher from "./CharacterFetcher";
import PlayerFetcher from "./PlayerFetcher";
import PocketBase from "./PocketBase";

export default class PostFetcher {
  public static async createPost<T extends Message, R>(message: T): Promise<R | void> {
    const [postPlayer, postPlayerError] = await safePromise(
      PlayerFetcher.getPlayerById(message.author.id)
    );
    if (postPlayerError) {
      console.error(postPlayerError);
      void message.reply(
        "Não foi possível encontrar o jogador para a criação do post: Erro Interno"
      );
      return;
    }
    const [postCharacter, postCharacterError] = await safePromise(
      CharacterFetcher.getCharacterById(postPlayer.currentCharacterId)
    );

    if (postCharacterError) {
      console.error(postCharacterError);
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
      console.error(createPostError);
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
      console.error(syncPostRelationsError);
      void message.reply("Não foi possível sincronizar as relações do post: Erro Interno");
      return;
    }
    return;
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
      console.error(e);
      return false;
    }
  }
}
