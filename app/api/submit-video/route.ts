import { NextResponse } from "next/server";
import { submitAvatar } from "@/lib/klingAvatar";

export async function POST(req: Request) {
  try {
    const { imageUrl, audioUrl, prompt } = await req.json();

    if (!imageUrl || !audioUrl) {
      return NextResponse.json(
        { success: false, error: "imageUrl and audioUrl are required" },
        { status: 400 }
      );
    }

    const generationId = await submitAvatar(imageUrl, audioUrl, prompt);
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
