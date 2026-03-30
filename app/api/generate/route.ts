import { NextResponse } from "next/server";
import type { GenerateRequest } from "@/types";
import { compilePrompt, getAnimationConfig } from "@/lib/promptCompiler";
import { generateVoice } from "@/lib/eleven";
import { submitAvatar } from "@/lib/klingAvatar";

export const maxDuration = 60;

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

    if (script && script.length > 300) {
      return NextResponse.json(
        { success: false, error: "Script exceeds 300 character limit" },
        { status: 400 }
      );
    }

    // 1. Compile prompt
    const prompt = compilePrompt({
      script: script || "",
      gestureMode: body.gestureMode,
      costume: body.costume,
      mouth: body.mouth,
      voicePreset: body.voicePreset,
      voiceTuning: body.voiceTuning,
      customPrompts: body.customPrompts,
    });

    // 2. Get audio URL — either generate TTS or use uploaded audio
    let audioUrl: string;
    if (voiceMode === "upload" && body.uploadedAudioUrl) {
      audioUrl = body.uploadedAudioUrl;
    } else {
      audioUrl = await generateVoice(script, body.voicePreset, body.voiceTuning);
    }

    // 3. Submit avatar generation to fal.ai queue (non-blocking)
    const animation = getAnimationConfig(body.gestureMode);
    const requestId = await submitAvatar({
      imageUrl: baseImageUrl,
      audioUrl,
      prompt,
      animation,
    });

    return NextResponse.json({ success: true, jobId: requestId });
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
