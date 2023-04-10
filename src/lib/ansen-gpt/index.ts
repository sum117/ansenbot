import { ChatVectorDBQAChain, LLMChain, loadQAChain } from "langchain/chains";
import { OpenAIChat } from "langchain/llms";
import type { PineconeStore } from "langchain/vectorstores";

import { CONDENSE_PROMPT, QA_PROMPT } from "./config/prompts";

export const makeChain = (vectorstore: PineconeStore): ChatVectorDBQAChain => {
  const questionGenerator = new LLMChain({
    llm: new OpenAIChat({ temperature: 0 }),
    prompt: CONDENSE_PROMPT,
  });
  const docChain = loadQAChain(
    new OpenAIChat({
      modelName: "gpt-3.5-turbo",
      temperature: 0,
    }),
    { prompt: QA_PROMPT }
  );

  return new ChatVectorDBQAChain({
    combineDocumentsChain: docChain,
    questionGeneratorChain: questionGenerator,
    returnSourceDocuments: true,
    vectorstore,
  });
};
