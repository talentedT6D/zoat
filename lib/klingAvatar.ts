import { fal } from "@/lib/fal";
import type { AnimationConfig } from "@/types";

const AVATAR_ENDPOINT = "fal-ai/creatify/aurora";

interface AvatarParams {
  imageUrl: string;
  audioUrl: string;
  prompt: string;
  animation: AnimationConfig;
}

/**
 * Submit avatar generation to fal.ai queue.
 * Returns a request_id that can be polled via checkAvatarStatus.
 */
export async function submitAvatar(params: AvatarParams): Promise<string> {
  const { imageUrl, audioUrl, prompt } = params;

  const { request_id } = await fal.queue.submit(AVATAR_ENDPOINT, {
    input: {
      image_url: imageUrl,
      audio_url: audioUrl,
      prompt: buildAuroraPrompt(prompt),
      guidance_scale: 1,
      audio_guidance_scale: 2,
      resolution: "720p",
    },
  });

  return request_id;
}

/**
 * Check avatar generation status by polling fal.ai queue.
 */
export async function checkAvatarStatus(
  requestId: string
): Promise<{ status: string; videoUrl?: string; error?: string }> {
  const queueStatus = await fal.queue.status(AVATAR_ENDPOINT, {
    requestId,
    logs: false,
  });

  const s = queueStatus.status as string;

  if (s === "COMPLETED") {
    const result = await fal.queue.result(AVATAR_ENDPOINT, { requestId });
    const data = result.data as { video: { url: string } };
    return { status: "done", videoUrl: data.video.url };
  }

  if (s === "FAILED") {
    return { status: "failed", error: "Avatar generation failed" };
  }

  // IN_QUEUE or IN_PROGRESS
  return { status: "processing" };
}

function buildAuroraPrompt(compiledPrompt: string): string {
  return `9:16 vertical framing. Black crocodile mascot character (ZAG) speaking directly to camera. ${compiledPrompt.slice(0, 500)}`;
}
