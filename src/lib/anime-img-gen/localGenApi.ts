import axios from "axios";

import type {
  LocalAnimeImageGenerationPendingStreamResponse,
  LocalAnimeImageGenerationProgressCallback,
  LocalAnimeImageGenerationRequest,
  LocalAnimeImageGenerationResponse,
  LocalAnimeImageGenerationSucceededStreamResponse,
} from "../../types/AnimeImageGenerator";

const localAnimeImgGenApi = axios.create({
  baseURL: process.env.ANIME_IMG_GEN_API_URL,
  headers: {
    Accept: "*/*",
    "User-Agent": "axios/0.21.1",
    "Content-Type": "application/json",
  },
});

export const localRequestImageGen = async (
  prompt: string
): Promise<LocalAnimeImageGenerationResponse> => {
  const seed = Math.floor(Math.random() * 10000000000);
  // timestamp in milliseconds
  const session_id = Date.now().toString();
  const data: LocalAnimeImageGenerationRequest = {
    prompt,
    seed,
    session_id,
    used_random_seed: true,
    negative_prompt:
      "nsfw, lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry",
    num_outputs: 1,
    num_inference_steps: 50,
    guidance_scale: 11,
    width: 512,
    height: 768,
    vram_usage_level: "high",
    sampler_name: "euler_a",
    use_stable_diffusion_model: "AnythingV5V3_v5PrtRE",
    use_vae_model: "" /* vae-ft-mse-840000-ema-pruned */,
    stream_progress_updates: true,
    stream_image_progress: false,
    show_only_filtered_image: true,
    block_nsfw: false,
    output_format: "png",
    output_quality: 75,
    output_lossless: false,
    metadata_output_format: "none",
    original_prompt: prompt,
    active_tags: [],
    inactive_tags: [],
    // use_face_correction: "GFPGANv1.3",
    // use_upscale: "RealESRGAN_x4plus_anime_6B",
    upscale_amount: "4",
  };

  const response = await localAnimeImgGenApi.post<LocalAnimeImageGenerationResponse>(
    "render",
    data
  );
  return response.data;
};

const getStreamProgress = async (path: string) => {
  const response = await localAnimeImgGenApi.get<
    | LocalAnimeImageGenerationPendingStreamResponse
    | LocalAnimeImageGenerationSucceededStreamResponse
  >(path);
  return response.data;
};

export const waitForLocalAnimeImageGen = async (
  stream: string,
  onProgress: LocalAnimeImageGenerationProgressCallback
): Promise<LocalAnimeImageGenerationSucceededStreamResponse | undefined> => {
  let isDone = false;
  let response:
    | LocalAnimeImageGenerationPendingStreamResponse
    | LocalAnimeImageGenerationSucceededStreamResponse = {
    step: 0,
    step_time: 0,
    total_steps: 0,
  };

  const checkIfDone = (
    res:
      | LocalAnimeImageGenerationPendingStreamResponse
      | LocalAnimeImageGenerationSucceededStreamResponse
  ): res is LocalAnimeImageGenerationSucceededStreamResponse => {
    return (
      typeof res === "object" && "output" in res && "status" in res && res.status === "succeeded"
    );
  };

  const isPending = (
    res:
      | LocalAnimeImageGenerationPendingStreamResponse
      | LocalAnimeImageGenerationSucceededStreamResponse
  ): res is LocalAnimeImageGenerationPendingStreamResponse => {
    return typeof res === "object" && "step" in res && "total_steps" in res;
  };

  while (!isDone) {
    response = await getStreamProgress(stream);
    isDone = checkIfDone(response);

    if (!isDone && isPending(response)) {
      await onProgress(response.step, response.total_steps);
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => {
        setTimeout(resolve, 5000);
      });
    }
  }

  return response as LocalAnimeImageGenerationSucceededStreamResponse;
};
