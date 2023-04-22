import { isImageUrl } from "../schemas/utiltitySchemas";
import axios from "axios";
import assert from "assert";
import { BotError } from "./Errors";

export default async function getImageBlob(value: string): Promise<{
  fileName: string;
  blob: Blob;
}> {
  const imageUrl = value.replace(/\?.*/, "");
  const image = await isImageUrl.parseAsync(imageUrl);
  const response = await axios.get(image, { responseType: "arraybuffer" });
  const fileName = image.split("/").pop();
  assert(fileName, new BotError("Couldn't find file name in image url."));
  return {
    fileName,
    blob: new Blob([response.data], { type: response.headers["content-type"] }),
  };
}
