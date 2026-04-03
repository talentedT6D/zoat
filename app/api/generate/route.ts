import { NextResponse } from "next/server";
import type { GenerateRequest } from "@/types";
import { compilePrompt, getAnimationConfig } from "@/lib/promptCompiler";
import { generateVoice } from "@/lib/eleven";
import { generateAvatar } from "@/lib/klingAvatar";
import { parseAnnotations } from "@/lib/scriptAnnotations";

export const maxDuration = 600; // 10 minutes

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

    if (script && script.length > 5000) {
      return NextResponse.json(
        { success: false, error: "Script exceeds 5000 character limit" },
        { status: 400 }
      );
    }

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

  // Parse inline annotations from script
  const parsed = parseAnnotations(script || "");

  // Reject if script is only annotations with no spoken text
  if (voiceMode === "tts" && !parsed.cleanScript) {
    throw new Error("Script must contain spoken text, not just annotations");
  }

  const prompt = compilePrompt({
    script: parsed.cleanScript,
    gestureMode,
    costume,
    mouth,
    bodyMovement: bodyMovement || { neck: 3, hands: 3, body: 2 },
    voicePreset,
    voiceTuning,
    customPrompts,
    annotationDirections: {
      gestures: parsed.gestureDirections,
      tone: parsed.toneDirections,
      cuesByCategory: parsed.cuesByCategory,
    },
  });

  let audioUrl: string;
  if (voiceMode === "upload" && uploadedAudioUrl) {
    audioUrl = uploadedAudioUrl;
  } else if (params.audioUrl) {
    // Pre-baked audio from Step 1 (two-step workflow) — skip TTS
    audioUrl = params.audioUrl;
  } else {
    // Fallback: generate TTS fresh
    audioUrl = await generateVoice(parsed.ttsText, voicePreset, voiceTuning);
  }

  const animation = getAnimationConfig(gestureMode, bodyMovement || { neck: 3, hands: 3, body: 2 });

  const videoUrl = await generateAvatar({
    imageUrl: baseImageUrl,
    audioUrl,
    prompt,
    animation,
    model: params.avatarModel,
  });

  return videoUrl;
}
