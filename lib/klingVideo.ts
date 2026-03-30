/**
 * Optional: B-roll / non-talking clip generation via fal.ai
 * Can use Kling, LTX, or other video models available on fal.ai
 */

import { fal } from "@fal-ai/client";

fal.config({ credentials: process.env.FAL_KEY! });

interface BRollParams {
  prompt: string;
  imageUrl?: string;
  duration?: number;
}

export async function generateBRollClip(
  params: BRollParams
): Promise<string> {
  const { prompt, imageUrl, duration = 5 } = params;

  const input: Record<string, unknown> = {
    prompt,
    duration: duration <= 5 ? "5" : "10",
  };
  if (imageUrl) input.image_url = imageUrl;

  const result = await fal.subscribe("fal-ai/kling-video/v2/master/image-to-video", {
    input: input as { prompt: string; image_url: string; duration: "5" | "10" },
  });

  const data = result.data as { video: { url: string } };
  return data.video.url;
}
