import { ChatVectorDBQAChain, LLMChain, loadQAChain } from "langchain/chains";
import { TextLoader } from "langchain/document_loaders";
import { OpenAIEmbeddings } from "langchain/embeddings";
import { OpenAIChat } from "langchain/llms";
import { PromptTemplate } from "langchain/prompts";
import { MarkdownTextSplitter } from "langchain/text_splitter";
import { HNSWLib } from "langchain/vectorstores";
import path from "path";

const CONDENSE_PROMPT =
  PromptTemplate.fromTemplate(`Dada a seguinte conversa e uma pergunta de acompanhamento, reformule a pergunta de acompanhamento para ser uma pergunta autônoma.

  Histórico do bate-papo:
  {chat_history}
  Acompanhamento de entrada: {question}
  Pergunta autônoma:`);

const QA_PROMPT = PromptTemplate.fromTemplate(
  `Você é um oraculo de um universo de fantasia sombria medieval chamado Ansenfall, seu nome é Arya e você é uma feiticeira que mora no meio de um casebre na Floresta de Fractaria. 
  
  Fora do personagem, você recebe partes extraídas de um longo documento e uma pergunta. Você deve responder uma resposta de conversação com base no contexto fornecido ou com base no seu personagem.
  
  Não saia do personagem. Se você não encontrar a resposta no contexto abaixo, basta dizer "Hmm, não tenho certeza".
  
  Se a pergunta não estiver relacionada ao contexto, seja casual e ofereça uma conversa divertida, com liberdade para fantasiar. Porém, não crie um novo contexto, nem mencione humanos, pois eles não existem neste universo. Não se Repita. Não saia do personagem.
  
  Pergunta: {question}
  =========
  {context}
  =========
  Resposta em Markdown:`
);

export const loadVectorStore = async (): Promise<HNSWLib> => {
  const filePaths = {
    docs: path.join("data", "ansenfall_docs.txt"),
    vectorStore: path.join("data", "ansenfall_vectorstore"),
  };
  try {
    console.log("Loading vector store", false);
    const vectorStore = await HNSWLib.load(filePaths.vectorStore, new OpenAIEmbeddings());
    return vectorStore;
  } catch {
    const loader = await new TextLoader(filePaths.docs).load();
    const splitter = new MarkdownTextSplitter();
    const docs = await splitter.splitDocuments(loader);
    const newVectorStore = await HNSWLib.fromDocuments(docs, new OpenAIEmbeddings());
    await newVectorStore.save(filePaths.vectorStore);
    return newVectorStore;
  }
};
export const makeChain = (vectorstore: HNSWLib): ChatVectorDBQAChain => {
  const questionGenerator = new LLMChain({
    llm: new OpenAIChat({ temperature: 0 }),
    prompt: CONDENSE_PROMPT,
  });
  const docChain = loadQAChain(
    new OpenAIChat({
      modelName: "gpt-3.5-turbo", // change this to older versions (e.g. gpt-3.5-turbo) if you don't have access to gpt-4
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
