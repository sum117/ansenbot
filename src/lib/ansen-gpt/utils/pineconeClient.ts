import { PineconeClient } from "@pinecone-database/pinecone";

import { BotError } from "../../../utils/Errors";

if (!process.env.PINECONE_ENVIRONMENT || !process.env.PINECONE_API_KEY) {
  throw new BotError("As variáveis de ambiente do Pinecone não foram encontradas.");
}

async function initPinecone() {
  try {
    const pinecone = new PineconeClient();

    await pinecone.init({
      apiKey: process.env.PINECONE_API_KEY ?? "",
      environment: process.env.PINECONE_ENVIRONMENT ?? "", // this is in the dashboard
    });

    return pinecone;
  } catch (error) {
    console.error("Error initializing pinecone client", error);
  }
}

export const pineconeClient = await initPinecone();
