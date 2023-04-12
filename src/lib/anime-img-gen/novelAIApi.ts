import axios from "axios";
import JSZip from "jszip";

import type { NovelAIRequest } from "../../types/AnimeImageGenerator";

const novelAIApi = axios.create({
  baseURL: process.env.NOVEL_AI_API_URL,
  headers: {
    Authorization: process.env.NOVEL_AI_API_KEY,
    "Content-Type": "application/json",
    "accept-encoding": "gzip, deflate, br",
  },
});

export const novelRequestImageGen = async (
  input: string
): Promise<Buffer | { botError: string }> => {
  // 9 digit seed
  const seed = Math.floor(Math.random() * 1000000000);
  const body: NovelAIRequest = {
    input,
    model: "nai-diffusion",
    action: "generate",
    parameters: {
      width: 512,
      height: 768,
      scale: 11,
      sampler: "k_euler_ancestral",
      steps: 28,
      n_samples: 1,
      ucPreset: 0,
      qualityToggle: true,
      sm: false,
      sm_dyn: false,
      dynamic_thresholding: false,
      controlnet_strength: 1,
      seed,
      legacy: false,
      negative_prompt:
        "nsfw, lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry",
    },
  };

  try {
    // content-disposition: attachment; filename=images.zip
    const zip = new JSZip();
    const response = await novelAIApi.post("/generate-image", body, {
      responseType: "arraybuffer",
    });
    const { data } = response;
    const zipFile = await zip.loadAsync(data);
    const zipFileContent = await zipFile.file("image_0.png")?.async("nodebuffer");

    if (!zipFileContent) {
      return {
        botError: "❌ Houve um erro ao extrair a imagem da resposta da API, tente novamente.",
      };
    }
    return zipFileContent;
  } catch (error) {
    console.log(error);
    return { botError: "❌ Houve um erro ao gerar sua imagem na API, por favor tente novamente." };
  }
};
