import type { AnimationConfig } from "@/types";

const HIGGSFIELD_API_KEY = process.env.HIGGSFIELD_API_KEY || "30d30b7f-2099-4276-940e-e367bec12ac9:743f29c61d87a0936891621382aebf83974395a198b038b129900a725851db44";
const HIGGSFIELD_API_URL = "https://api.higgsfield.ai/v1/speak/higgsfield";
const HIGGSFIELD_STATUS_URL = "https://api.higgsfield.ai/v1/generations";

interface AvatarParams {
  imageUrl: string;
  audioUrl: string;
  prompt: string;
  animation: AnimationConfig;
}

/**
 * Generate talking avatar video using Higgsfield Cloud API
 * Takes base image + audio → returns MP4 video URL
 */
export async function generateAvatar(params: AvatarParams): Promise<string> {
  const { imageUrl, audioUrl } = params;

  // 1. Submit generation job
  const submitRes = await fetch(HIGGSFIELD_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Key ${HIGGSFIELD_API_KEY}`,
    },
    body: JSON.stringify({
      task: "talking-avatar",
      input_image: imageUrl,
      input_audio: audioUrl,
      quality: "high",
    }),
  });

  if (!submitRes.ok) {
    const errText = await submitRes.text();
    throw new Error(`Higgsfield API error (${submitRes.status}): ${errText}`);
  }

  const submitData = await submitRes.json();
  const generationId = submitData.generation_id || submitData.request_id || submitData.id;

  if (!generationId) {
    throw new Error(`Higgsfield API error: no generation ID returned. Response: ${JSON.stringify(submitData)}`);
  }

  // 2. Poll for completion
  const videoUrl = await pollForCompletion(generationId);
  return videoUrl;
}

/**
 * Poll Higgsfield API until the video is ready
 */
async function pollForCompletion(generationId: string): Promise<string> {
  const maxAttempts = 120; // 10 minutes at 5s intervals
  const interval = 5000;

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, interval));

    const res = await fetch(`${HIGGSFIELD_STATUS_URL}/${generationId}`, {
      headers: {
        "Authorization": `Key ${HIGGSFIELD_API_KEY}`,
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Higgsfield status check error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const status = data.status;

    if (status === "completed") {
      const videoUrl = data.output_url || data.media_urls?.[0];
      if (!videoUrl) {
        throw new Error("Higgsfield completed but no video URL returned");
      }
      return videoUrl;
    }

    if (status === "failed" || status === "nsfw" || status === "cancelled") {
      throw new Error(`Higgsfield generation ${status}: ${data.error || "Unknown error"}`);
    }

    // Otherwise still queued/in_progress — keep polling
  }

  throw new Error("Higgsfield generation timed out after 10 minutes");
}
