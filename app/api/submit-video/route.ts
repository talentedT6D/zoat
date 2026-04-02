import { NextResponse } from "next/server";
import { submitAvatar } from "@/lib/klingAvatar";
import { fal } from "@fal-ai/client";
import sharp from "sharp";

fal.config({ credentials: process.env.FAL_KEY || "edc34a51-7f9f-4726-b931-3d6eca3986ea:79a3307eb88a467aa444213ec04d5632" });

/**
 * Download image, resize to max 768px, compress as JPEG, re-upload to fal
 */
async function resizeAndUpload(imageUrl: string): Promise<string> {
  const res = await fetch(imageUrl);
  const buffer = Buffer.from(await res.arrayBuffer());

  const resized = await sharp(buffer)
    .resize(768, 768, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();

  // Convert Node Buffer to ArrayBuffer for File/Blob compatibility
  const ab = resized.buffer.slice(resized.byteOffset, resized.byteOffset + resized.byteLength) as ArrayBuffer;
  const file = new File([ab], "image.jpg", { type: "image/jpeg" });
  return await fal.storage.upload(file);
}

export async function POST(req: Request) {
  try {
    const { imageUrl, audioUrl, prompt } = await req.json();

    if (!imageUrl || !audioUrl) {
      return NextResponse.json(
        { success: false, error: "imageUrl and audioUrl are required" },
        { status: 400 }
      );
    }

    const smallImageUrl = await resizeAndUpload(imageUrl);
    const generationId = await submitAvatar(smallImageUrl, audioUrl, prompt);
    return NextResponse.json({ success: true, generationId });
  } catch (error) {
    console.error("Submit video error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
