import { ConversationalRetrievalQAChain, LLMChain, loadQAChain } from "langchain/chains";
import { OpenAIChat } from "langchain/llms";
import type { PineconeStore } from "langchain/vectorstores";

import { CONDENSE_PROMPT, QA_PROMPT } from "./config/prompts";

export const makeChain = (vectorstore: PineconeStore): ConversationalRetrievalQAChain => {
  const questionGenerator = new LLMChain({
    llm: new OpenAIChat({ temperature: 0 }),
    prompt: CONDENSE_PROMPT,
  });
  const docChain = loadQAChain(
    new OpenAIChat({
      modelName: "gpt-4",
      temperature: 0.5,
    }),
    { prompt: QA_PROMPT }
  );
  return new ConversationalRetrievalQAChain({
    retriever: vectorstore.asRetriever(),
    combineDocumentsChain: docChain,
    questionGeneratorChain: questionGenerator,
  });
};
