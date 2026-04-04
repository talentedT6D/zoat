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

  const prompt = `9:16 vertical. ${videoPrompt}`.slice(0, 500);

  if (model === "ai-avatar") {
    return callFal("fal-ai/ai-avatar", {
      image_url: imageUrl, audio_url: audioUrl, prompt,
      num_frames: 81,
      resolution: "480p",
      acceleration: "high",
    });
  }

  // Aurora (default)
  return callFal("fal-ai/creatify/aurora", {
    image_url: imageUrl, audio_url: audioUrl, prompt,
    guidance_scale: 1.5, audio_guidance_scale: 2, resolution: "720p",
  });
}

async function callFal(endpoint: string, input: Record<string, unknown>): Promise<string> {
  try {
    const result = await fal.subscribe(endpoint as Parameters<typeof fal.subscribe>[0], {
      input,
      pollInterval: 2000,
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
    throw new Error(`${endpoint.split("/").pop()}: ${msg}`);
  }
}
