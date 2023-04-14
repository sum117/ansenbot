import { Message } from "discord.js";
import { Post } from "../../types/Character";
import safePromise from "../../utils/safePromise";
import PocketBase from "./PocketBase";
import PlayerFetcher from "./PlayerFetcher";
import CharacterFetcher from "./CharacterFetcher";

export default class PostFetcher {
    public static async createPost<T extends Message, R>(message: T): Promise<R | void> {
        const [postPlayer, postPlayerError] = await safePromise(PlayerFetcher.getPlayerById(message.author.id));
        if (postPlayerError || !postPlayer?.currentCharacterId) {
          void message.reply(
            "Não foi possível encontrar o jogador para a criação do post: Erro Interno"
          );
          return;
        }
        const [postCharacter, postCharacterError] = await safePromise(
          CharacterFetcher.getCharacterById(postPlayer.currentCharacterId)
        );
    
        if (postCharacterError || !postCharacter) {
          void message.reply(
            "Não foi possível encontrar o personagem para a criação do post: Erro Interno"
          );
          return;
        }
    
        const post = await PocketBase.createEntity<Post>({
          entityData: {
            character: postCharacter.id,
            player: postPlayer.id,
            content: message.content,
            messageId: message.id,
          },
          entityType: "posts",
        });
      }
}