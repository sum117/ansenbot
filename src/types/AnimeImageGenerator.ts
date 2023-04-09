export type NovelAIRequest = {
  input: string;
  model: "nai-diffusion";
  action: string;
  parameters: NovelAIParameters;
};

export type NovelAIParameters = {
  width: number;
  height: number;
  scale: number;
  sampler: string;
  steps: number;
  n_samples: number;
  ucPreset: number;
  qualityToggle: boolean;
  sm: boolean;
  sm_dyn: boolean;
  dynamic_thresholding: boolean;
  controlnet_strength: number;
  legacy: boolean;
  seed?: number;
  negative_prompt: string;
};

export type LocalAnimeImageGenerationRequest = {
  active_tags: string[];
  block_nsfw: boolean;
  guidance_scale: number;
  height: number;
  inactive_tags: string[];
  metadata_output_format: string;
  negative_prompt: string;
  num_inference_steps: number;
  num_outputs: number;
  original_prompt: string;
  output_format: string;
  output_lossless: boolean;
  output_quality: number;
  prompt: string;
  sampler_name: string;
  seed: number;
  session_id: string;
  show_only_filtered_image: boolean;
  stream_image_progress: boolean;
  stream_progress_updates: boolean;
  upscale_amount: string;
  use_face_correction?: string;
  use_stable_diffusion_model: string;
  use_upscale?: string;
  use_vae_model: string;
  used_random_seed: boolean;
  vram_usage_level: string;
  width: number;
};

export type LocalAnimeImageGenerationResponse = {
  queue: number;
  status: "Online" | "Offline";
  stream: `/image/stream/${string}`;
  task: number;
};

export type LocalAnimeImageGenerationProgressCallback = (
  step: number,
  totalSteps: number
) => Promise<void>;

export type LocalAnimeImageGenerationPendingStreamResponse = {
  step: number;
  step_time: number;
  total_steps: number;
};

export type LocalAnimeImageGenerationSucceededStreamResponse = {
  output: Array<{ data: string; path_abs: null; seed: number }>;
  render_request: LocalAnimeImageGenerationRequest;
  status: "succeeded" | "failed";
  task_data: Record<string, any>;
};
