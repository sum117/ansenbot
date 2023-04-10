import { makeChain } from "../lib/ansen-gpt";
import { PINECONE_INDEX_NAME, PINECONE_NAME_SPACE } from "../lib/ansen-gpt/config/pinecone";
import { pineconeClient } from "../lib/ansen-gpt/utils/pineconeClient";

@Discord()
export class OnOracleChat {
  private vectorStore: PineconeStore | null = null;
  private history: [string, string][] = [];
  private _chain: ChatVectorDBQAChain | null = null;

  get chain(): ChatVectorDBQAChain {
    if (!this._chain) {
      throw new Error("Chain not initialized");
    }
    return this._chain;
  }

  set chain(chain: ChatVectorDBQAChain) {
    this._chain = chain;
  }

  @On()
  async messageCreate([message]: ArgsOf<"messageCreate">, _client: Client): Promise<void> {
    if (!message.content.startsWith("!oracle")) {
      return;
    }

    if (!this.vectorStore) {
      const index = pineconeClient.Index(PINECONE_INDEX_NAME);
      this.vectorStore = await PineconeStore.fromExistingIndex(new OpenAIEmbeddings({}), {
        namespace: PINECONE_NAME_SPACE,
        pineconeIndex: index,
        textKey: "text",
      });

      this.chain = makeChain(this.vectorStore);
    }

    const sanitizedMessage = message.content.trim().replace("!test", "").replaceAll("\n", " ");

    try {
      await message.channel.sendTyping();
      const response = await this.chain.call({
        chat_history: this.history ?? [],
        question: sanitizedMessage,
      });
      if (response.text.length > 2000) {
        const text = split(response.text, "", 2000);
        for await (const t of text) {
          message.reply(t);
        }
      } else {
        await message.reply(response.text);
      }
      this.history.push([sanitizedMessage, ""]);
    } catch (error) {
      console.error(error);
      await message.reply(
        "Me desculpe... estou com problemas internos no momento, tente novamente mais tarde."
      );
    }
  }
}
