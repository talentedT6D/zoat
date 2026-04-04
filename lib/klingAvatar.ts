import { fal } from "@fal-ai/client";
import type { AvatarModel } from "@/types";

fal.config({ credentials: process.env.FAL_KEY || "edc34a51-7f9f-4726-b931-3d6eca3986ea:79a3307eb88a467aa444213ec04d5632" });

interface AvatarParams {
  imageUrl: string;
  audioUrl: string;
  videoPrompt: string;
  negativePrompt?: string;
  model?: AvatarModel;
}

export async function generateAvatar(params: AvatarParams): Promise<string> {
  const { imageUrl, audioUrl, videoPrompt, negativePrompt, model = "aurora" } = params;

  // Keep prompt short — shorter prompts = faster processing
  const prompt = `9:16 vertical. ${videoPrompt}`.slice(0, 500);
  const neg = negativePrompt || "blurry, deformed, static, bad quality";

  switch (model) {
    case "hedra":
      return callFal("fal-ai/hedra", {
        image_url: imageUrl, audio_url: audioUrl, prompt,
      });

    case "ai-avatar":
      return callFal("fal-ai/ai-avatar", {
        image_url: imageUrl, audio_url: audioUrl, prompt,
        num_frames: 81,        // minimum frames = fastest render
        resolution: "480p",    // 480p is 2x faster than 720p
        acceleration: "high",  // max acceleration
      });

    case "kling":
      return callFal("fal-ai/kling-video/v1/standard/ai-avatar", {  // standard is faster than pro
        image_url: imageUrl, audio_url: audioUrl, prompt,
      });

    case "hunyuan":
      return callFal("fal-ai/hunyuan-avatar", {
        image_url: imageUrl, audio_url: audioUrl, text: prompt,
        num_inference_steps: 15,  // 15 instead of 30 = 2x faster
        turbo_mode: true,
      });

    case "echomimic":
      return callFal("fal-ai/echomimic-v3", {
        image_url: imageUrl, audio_url: audioUrl, prompt,
        negative_prompt: neg,
        guidance_scale: 3.5,        // lower = faster
        audio_guidance_scale: 2.0,
        num_frames_per_generation: 81,  // minimum frames
      });

    case "omnihuman":
      return callFal("fal-ai/bytedance/omnihuman/v1.5", {
        image_url: imageUrl, audio_url: audioUrl, prompt,
        turbo_mode: true,
      });

    case "wan-speech":
      return callFal("fal-ai/wan/v2.2-14b/speech-to-video", {
        image_url: imageUrl, audio_url: audioUrl, prompt,
        negative_prompt: neg,
        resolution: "480p",           // 480p instead of 720p = much faster
        guidance_scale: 3.0,
        num_inference_steps: 15,      // 15 instead of 27 = ~2x faster
      });

    case "infinitalk":
      return callFal("fal-ai/infinitalk", {
        image_url: imageUrl, audio_url: audioUrl, prompt,
        num_frames: 81,
        resolution: "480p",
        acceleration: "high",
      });

    case "aurora":
    default:
      return callFal("fal-ai/creatify/aurora", {
        image_url: imageUrl, audio_url: audioUrl, prompt,
        guidance_scale: 1.5, audio_guidance_scale: 2, resolution: "720p",
      });
  }
}

async function callFal(endpoint: string, input: Record<string, unknown>): Promise<string> {
  try {
    const result = await fal.subscribe(endpoint as Parameters<typeof fal.subscribe>[0], {
      input,
      pollInterval: 2000,     // check every 2s instead of 3s
      timeout: 600_000,
    });
    const data = result.data as Record<string, unknown>;

    const video = data.video as { url?: string } | undefined;
    if (video?.url) return video.url;
    if (typeof data.video === "string") return data.video as string;
    const output = data.output as { url?: string } | undefined;
    if (output?.url) return output.url;

    throw new Error(`No video URL in response from ${endpoint}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`${endpoint.split("/").pop()}: ${msg}. Try Aurora model or shorter audio.`);
  }
}
