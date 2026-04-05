import { NextResponse } from "next/server";
import { fal } from "@fal-ai/client";

fal.config({ credentials: process.env.FAL_KEY || "edc34a51-7f9f-4726-b931-3d6eca3986ea:79a3307eb88a467aa444213ec04d5632" });

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { prompt, imageUrl } = await req.json();

    if (!prompt?.trim()) {
      return NextResponse.json({ success: false, error: "Prompt is required" }, { status: 400 });
    }
    if (!imageUrl) {
      return NextResponse.json({ success: false, error: "Base image is required" }, { status: 400 });
    }

    const result = await fal.subscribe("fal-ai/nano-banana-pro/edit" as Parameters<typeof fal.subscribe>[0], {
      input: {
        prompt: prompt.trim(),
        image_urls: [imageUrl],
        resolution: "1K",
        aspect_ratio: "auto",
        num_images: 1,
        output_format: "png",
      },
    });

    const data = result.data as { images?: Array<{ url?: string }> };
    const url = data.images?.[0]?.url;

    if (!url) {
      return NextResponse.json({ success: false, error: "No image returned" }, { status: 500 });
    }

    return NextResponse.json({ success: true, imageUrl: url });
  } catch (error) {
    console.error("Customize image error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Image generation failed",
    }, { status: 500 });
  }
}
