import { BotError } from "../../../utils/Errors";

if (!process.env.PINECONE_INDEX_NAME) {
  throw new BotError("Missing Pinecone index name in .env file");
}

const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME ?? "";

const PINECONE_NAME_SPACE = "ansengpt";

export { PINECONE_INDEX_NAME, PINECONE_NAME_SPACE };
