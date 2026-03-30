import { fal } from "@fal-ai/client";
import type { AnimationConfig } from "@/types";

// Configure fal client
fal.config({ credentials: process.env.FAL_KEY! });

interface AvatarParams {
  imageUrl: string;
  audioUrl: string;
  prompt: string;
  animation: AnimationConfig;
}

/**
 * Generate talking avatar video using fal.ai Creatify Aurora
 * Takes ZAG base image + audio → returns MP4 video URL
 */
export async function generateAvatar(params: AvatarParams): Promise<string> {
  const { imageUrl, audioUrl, prompt } = params;

  const result = await fal.subscribe("fal-ai/creatify/aurora", {
    input: {
      image_url: imageUrl,
      audio_url: audioUrl,
      prompt: buildAuroraPrompt(prompt),
      guidance_scale: 1,
      audio_guidance_scale: 2,
      resolution: "720p",
    },
  });

  const data = result.data as { video: { url: string } };
  return data.video.url;
}

/**
 * Condense the full compiled prompt into Aurora-optimized guidance
 */
function buildAuroraPrompt(compiledPrompt: string): string {
  return `9:16 vertical framing. Black crocodile mascot character (ZAG) speaking directly to camera. ${compiledPrompt.slice(0, 500)}`;
}
