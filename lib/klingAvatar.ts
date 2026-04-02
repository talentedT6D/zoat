import { fal } from "@fal-ai/client";
import type { AnimationConfig } from "@/types";

// Configure fal client
fal.config({ credentials: process.env.FAL_KEY || "edc34a51-7f9f-4726-b931-3d6eca3986ea:79a3307eb88a467aa444213ec04d5632" });

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

  // Scale guidance based on how much movement is requested
  // More movement description → higher guidance to follow the prompt
  const guidanceScale = prompt.length > 800 ? 1.5 : 1;

  const result = await fal.subscribe("fal-ai/creatify/aurora", {
    input: {
      image_url: imageUrl,
      audio_url: audioUrl,
      prompt: buildAuroraPrompt(prompt),
      guidance_scale: guidanceScale,
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
  return `9:16 vertical framing. Black crocodile mascot character (ZAG) speaking directly to camera. ${compiledPrompt.slice(0, 700)}`;
}
