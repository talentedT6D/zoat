import { NextResponse } from "next/server";
import type { GenerateRequest } from "@/types";
import { generateVoice } from "@/lib/eleven";
import { submitAvatar } from "@/lib/klingAvatar";

export async function POST(req: Request) {
  try {
    const body: GenerateRequest = await req.json();
    const { script, voiceMode, baseImageUrl } = body;

    if (!baseImageUrl) {
      return NextResponse.json(
        { success: false, error: "Base image is required" },
        { status: 400 }
      );
    }

    if (voiceMode === "tts" && (!script || script.length === 0)) {
      return NextResponse.json(
        { success: false, error: "Script is required for TTS mode" },
        { status: 400 }
      );
    }

    if (voiceMode === "upload" && !body.uploadedAudioUrl) {
      return NextResponse.json(
        { success: false, error: "Audio file is required for lip-sync mode" },
        { status: 400 }
      );
    }

    if (script && script.length > 2000) {
      return NextResponse.json(
        { success: false, error: "Script exceeds 2000 character limit" },
        { status: 400 }
      );
    }

    // 1. Get audio URL — TTS or uploaded
    let audioUrl: string;
    if (voiceMode === "upload" && body.uploadedAudioUrl) {
      audioUrl = body.uploadedAudioUrl;
    } else {
      audioUrl = await generateVoice(script, body.voicePreset, body.voiceTuning);
    }

    // 2. Submit to Higgsfield (returns immediately with generation ID)
    const generationId = await submitAvatar(baseImageUrl, audioUrl);

    return NextResponse.json({ success: true, generationId });
  } catch (error) {
    console.error("Generate error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
