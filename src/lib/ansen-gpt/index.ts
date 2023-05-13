import { ConversationalRetrievalQAChain } from "langchain/chains";
import { OpenAIChat } from "langchain/llms";
import type { PineconeStore } from "langchain/vectorstores";

export const makeChain = (vectorstore: PineconeStore): ConversationalRetrievalQAChain => {
  const model = new OpenAIChat({ modelName: "gpt-4", temperature: 0.5 });
  return ConversationalRetrievalQAChain.fromLLM(model, vectorstore.asRetriever());
};
