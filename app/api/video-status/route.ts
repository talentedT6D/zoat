import { NextResponse } from "next/server";
import { fal } from "@fal-ai/client";

fal.config({ credentials: process.env.FAL_KEY || "edc34a51-7f9f-4726-b931-3d6eca3986ea:79a3307eb88a467aa444213ec04d5632" });

export const maxDuration = 10;

/**
 * Check video generation status. Returns status + video URL when done.
 */
export async function POST(req: Request) {
  try {
    const { requestId, endpoint } = await req.json();

    const statusResult = await fal.queue.status(endpoint as Parameters<typeof fal.queue.status>[0], {
      requestId,
      logs: false,
    });

    const st = statusResult.status as string;

    if (st === "COMPLETED") {
      const result = await fal.queue.result(endpoint as Parameters<typeof fal.queue.result>[0], {
        requestId,
      });
      const data = result.data as Record<string, unknown>;

      const video = data.video as { url?: string } | undefined;
      const videoUrl = video?.url || (typeof data.video === "string" ? data.video : null);

      if (videoUrl) {
        return NextResponse.json({ success: true, status: "done", videoUrl });
      }
      return NextResponse.json({ success: false, status: "failed", error: "No video URL in response" });
    }

    if (st === "FAILED") {
      return NextResponse.json({ success: false, status: "failed", error: "Video generation failed" });
    }

    // Still processing
    return NextResponse.json({ success: true, status: "processing" });
  } catch (error) {
    return NextResponse.json({
      success: false,
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
