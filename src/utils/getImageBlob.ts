import assert from "assert";
import axios from "axios";

import { isImageUrl } from "../schemas/utiltitySchemas";
import { BotError } from "./Errors";
import resizeImage from "./resizeImage";

export default async function getImageBlob(value: string): Promise<{
  fileName: string;
  blob: Blob;
}> {
  const imageUrl = value.replace(/\?.*/, "");
  const image = isImageUrl.parse(imageUrl);
  const response = await axios.get(image, { responseType: "arraybuffer" });
  const resizedImage = await resizeImage(Buffer.from(response.data));
  const fileName = image.split("/").pop();
  assert(fileName, new BotError("Não foi possível encontrar o nome do arquivo no URL da imagem."));
  return {
    fileName,
    blob: new Blob([resizedImage], { type: response.headers["content-type"] }),
  };
}
