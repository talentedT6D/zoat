import { NextResponse } from "next/server";
import type { GenerateRequest } from "@/types";
import { compilePrompt, getAnimationConfig } from "@/lib/promptCompiler";
import { generateVoice } from "@/lib/eleven";
import { generateAvatar } from "@/lib/klingAvatar";

export const maxDuration = 300; // Allow up to 5 minutes for Vercel

export async function POST(req: Request) {
  try {
    const body: GenerateRequest = await req.json();
    const { script, voiceMode, baseImageUrl } = body;

    // Validate base image
    if (!baseImageUrl) {
      return NextResponse.json(
        { success: false, error: "Base image is required" },
        { status: 400 }
      );
    }

    // Validate script (required for TTS mode)
    if (voiceMode === "tts" && (!script || script.length === 0)) {
      return NextResponse.json(
        { success: false, error: "Script is required for TTS mode" },
        { status: 400 }
      );
    }

    // Validate uploaded audio (required for upload mode)
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

    // Run the full pipeline synchronously
    const videoUrl = await runPipeline(body);

    return NextResponse.json({ success: true, videoUrl });
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

async function runPipeline(params: GenerateRequest): Promise<string> {
  const {
    script,
    gestureMode,
    costume,
    mouth,
    bodyMovement,
    voicePreset,
    voiceTuning,
    voiceMode,
    baseImageUrl,
    uploadedAudioUrl,
    customPrompts,
  } = params;

  // 1. Compile prompt
  const prompt = compilePrompt({
    script: script || "",
    gestureMode,
    costume,
    mouth,
    bodyMovement: bodyMovement || { neck: 3, hands: 3, body: 2 },
    voicePreset,
    voiceTuning,
    customPrompts,
  });

  // 2. Get audio URL — either generate TTS or use uploaded audio
  let audioUrl: string;
  if (voiceMode === "upload" && uploadedAudioUrl) {
    audioUrl = uploadedAudioUrl;
  } else {
    audioUrl = await generateVoice(script, voicePreset, voiceTuning);
  }

  // 3. Generate avatar video
  const animation = getAnimationConfig(gestureMode, bodyMovement || { neck: 3, hands: 3, body: 2 });

  const videoUrl = await generateAvatar({
    imageUrl: baseImageUrl,
    audioUrl,
    prompt,
    animation,
  });

  return videoUrl;
}
