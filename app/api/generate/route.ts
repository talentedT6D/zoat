import { NextResponse } from "next/server";
import type { GenerateRequest } from "@/types";
import { compilePrompt, getAnimationConfig } from "@/lib/promptCompiler";
import { generateVoice } from "@/lib/eleven";
import { generateAvatar } from "@/lib/klingAvatar";
import { createJob, updateJob, generateJobId } from "@/lib/jobStore";

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

    if (script && script.length > 300) {
      return NextResponse.json(
        { success: false, error: "Script exceeds 300 character limit" },
        { status: 400 }
      );
    }

    const jobId = generateJobId();
    createJob(jobId);

    runPipeline(jobId, body).catch((err) => {
      console.error(`Job ${jobId} failed:`, err);
      updateJob(jobId, { status: "failed", error: err.message });
    });

    return NextResponse.json({ success: true, jobId });
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

async function runPipeline(jobId: string, params: GenerateRequest) {
  const {
    script,
    gestureMode,
    costume,
    mouth,
    voicePreset,
    voiceTuning,
    voiceMode,
    baseImageUrl,
    uploadedAudioUrl,
    customPrompts,
  } = params;

  // 1. Compile prompt (with optional custom overrides)
  const prompt = compilePrompt({
    script: script || "",
    gestureMode,
    costume,
    mouth,
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

  // 3. Generate avatar — user-uploaded base image
  const animation = getAnimationConfig(gestureMode);

  const videoUrl = await generateAvatar({
    imageUrl: baseImageUrl,
    audioUrl,
    prompt,
    animation,
  });

  // 4. Update job with result
  updateJob(jobId, { status: "done", videoUrl });
}
