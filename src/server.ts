import express from "express";
import { z } from "zod";

import { createUpdateCharacterSchema } from "./schemas/characterSchema";

const server = express();
server.use(express.json());
server.post("/character", async (req: express.Request, res: express.Response) => {
  console.log(req.body);
  try {
    await createUpdateCharacterSchema.parseAsync(req.body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

export default server;
