import sharp from "sharp";

export default async function resizeImage(buffer: Buffer): Promise<Buffer> {
  const outputBuffer = await sharp(buffer)
    .resize(768, 512, {
      fit: "contain",
      withoutEnlargement: true,
    })
    .toBuffer();
  return outputBuffer;
}
