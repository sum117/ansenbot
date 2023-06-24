import { NotBot } from "@discordx/utilities";
import type { SimpleCommandMessage } from "discordx";
import { Discord, Guard, SimpleCommand } from "discordx";
import type { ConversationalRetrievalQAChain } from "langchain/chains";
import { OpenAIEmbeddings } from "langchain/embeddings";
import { PineconeStore } from "langchain/vectorstores";
import split from "lodash.split";

import { makeChain } from "../lib/ansen-gpt";
import { PINECONE_INDEX_NAME, PINECONE_NAME_SPACE } from "../lib/ansen-gpt/config/pinecone";
import { pineconeClient } from "../lib/ansen-gpt/utils/pineconeClient";
import { BotError } from "../utils/Errors";

@Discord()
export class OnOracleChat {
  private vectorStore: PineconeStore | null = null;
  private history: [string, string][] = [];
  private _chain: ConversationalRetrievalQAChain | null = null;

  get chain(): ConversationalRetrievalQAChain {
    if (!this._chain) {
      throw new BotError(
        "A corrente de conversa com o Oráculo não foi inicializada ainda. Entre em contato com um administrador."
      );
    }
    return this._chain;
  }

  set chain(chain: ConversationalRetrievalQAChain) {
    this._chain = chain;
  }

  @SimpleCommand({ name: "oracle" })
  @Guard(NotBot)
  async main({ message }: SimpleCommandMessage): Promise<void> {
    try {
      if (!this.vectorStore) {
        const index = pineconeClient?.Index(PINECONE_INDEX_NAME);
        if (!index) {
          console.error("Pinecone Client not initialized");
          return;
        }
        this.vectorStore = await PineconeStore.fromExistingIndex(new OpenAIEmbeddings({}), {
          namespace: PINECONE_NAME_SPACE,
          pineconeIndex: index,
          textKey: "text",
        });

        this.chain = makeChain(this.vectorStore);
      }

      const sanitizedMessage = message.content.trim().replace("!test", "").replaceAll("\n", " ");

      await message.channel.sendTyping();
      const response = await this.chain.call({
        chat_history: this.history ?? [],
        question: sanitizedMessage,
      });
      if (response.text.length > 2000) {
        const text = split(response.text, "", 2000);
        for await (const t of text) {
          await message.reply(t);
        }
      } else {
        await message.reply(response.text);
      }
      this.history.push([sanitizedMessage, ""]);
    } catch (error) {
      console.error("Error on oracle chat", error);
      await message
        .reply(
          "Me desculpe... estou com problemas internos no momento, tente novamente mais tarde."
        )
        .catch(() => null);
    }
  }
}
