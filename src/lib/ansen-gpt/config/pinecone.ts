import { BotError } from "../../../utils/Errors";

if (!process.env.PINECONE_INDEX_NAME) {
  throw new BotError("Não consegui encontrar o nome do índice do Pinecone para executar a query.");
}

const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME ?? "";

const PINECONE_NAME_SPACE = "ansengpt";

export { PINECONE_INDEX_NAME, PINECONE_NAME_SPACE };
