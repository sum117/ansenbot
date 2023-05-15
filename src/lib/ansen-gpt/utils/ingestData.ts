import { DirectoryLoader, TextLoader } from "langchain/document_loaders";
import { OpenAIEmbeddings } from "langchain/embeddings";
import { MarkdownTextSplitter } from "langchain/text_splitter";
import { PineconeStore } from "langchain/vectorstores";
import path from "path";
import { fileURLToPath } from "url";

import { BotError } from "../../../utils/Errors";
import { PINECONE_INDEX_NAME, PINECONE_NAME_SPACE } from "../config/pinecone";
import { pineconeClient } from "./pineconeClient";

const dirPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "data",
  "ansenfall"
);

export const run = async (): Promise<void> => {
  try {
    const directoryLoader = new DirectoryLoader(
      dirPath,
      {
        ".md": (filePath: string) => new TextLoader(filePath),
      },
      true
    );

    const rawDocs = await directoryLoader.load();

    const textSplitter = new MarkdownTextSplitter({
      chunkOverlap: 200,
      chunkSize: 1000,
    });

    const docs = await textSplitter.splitDocuments(rawDocs);
    console.log("split docs", docs);

    console.log("creating vector store...");
    const embeddings = new OpenAIEmbeddings();

    if (!pineconeClient) {
      console.error("O cliente do pinecone não foi inicializado.");
      return;
    }

    const index = pineconeClient.Index(PINECONE_INDEX_NAME);

    await PineconeStore.fromDocuments(docs, embeddings, {
      namespace: PINECONE_NAME_SPACE,
      pineconeIndex: index,
      textKey: "text",
    });
  } catch (error) {
    console.error("Error ingesting data", error);
    throw new BotError(
      "Houve um erro ao tentar inserir os dados no Pinecone. Por favor, entre em contato com um administrad"
    );
  }
};

(async () => {
  await run();
  console.log("ingestion complete");
})();
