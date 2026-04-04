import { NextResponse } from "next/server";
import { fal } from "@fal-ai/client";

fal.config({ credentials: process.env.FAL_KEY || "edc34a51-7f9f-4726-b931-3d6eca3986ea:79a3307eb88a467aa444213ec04d5632" });

export const maxDuration = 30;

/**
 * Submit video generation job and return request_id immediately.
 * Client polls for completion — no server-side blocking.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { imageUrl, audioUrl, videoPrompt } = body;
    const model: string = body.model || "aurora";
    const renderMode: "speed" | "balanced" | "quality" =
      body.renderMode === "speed" ? "speed" : body.renderMode === "quality" ? "quality" : "balanced";

    if (!imageUrl || !audioUrl) {
      return NextResponse.json({ success: false, error: "Image and audio required" }, { status: 400 });
    }

    const prompt = `9:16 vertical. ${(videoPrompt || "").slice(0, 500)}`;

    let endpoint: string;
    let input: Record<string, unknown>;

    if (model === "ai-avatar") {
      endpoint = "fal-ai/ai-avatar";
      const config = {
        speed:    { num_frames: 81,  resolution: "480p", acceleration: "high" },
        balanced: { num_frames: 113, resolution: "480p", acceleration: "regular" },
        quality:  { num_frames: 145, resolution: "720p", acceleration: "none" },
      }[renderMode];
      input = { image_url: imageUrl, audio_url: audioUrl, prompt, ...config };
    } else {
      endpoint = "fal-ai/creatify/aurora";
      const config = {
        speed:    { guidance_scale: 1, audio_guidance_scale: 1.5, resolution: "480p" },
        balanced: { guidance_scale: 1.5, audio_guidance_scale: 2, resolution: "720p" },
        quality:  { guidance_scale: 2.5, audio_guidance_scale: 3, resolution: "720p" },
      }[renderMode];
      input = { image_url: imageUrl, audio_url: audioUrl, prompt, ...config };
    }

    // Submit job — returns immediately with request_id
    const { request_id } = await fal.queue.submit(endpoint as Parameters<typeof fal.queue.submit>[0], { input });

    return NextResponse.json({ success: true, requestId: request_id, endpoint });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
