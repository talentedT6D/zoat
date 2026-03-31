import { NextResponse } from "next/server";
import type { GenerateRequest } from "@/types";
import { submitVoice } from "@/lib/eleven";

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

    // For upload mode, skip TTS — go straight to avatar submission
    if (voiceMode === "upload" && body.uploadedAudioUrl) {
      // Encode pipeline params as a compound jobId
      const jobId = encodeJobId("avatar_pending", "", body);
      return NextResponse.json({ success: true, jobId });
    }

    // For TTS mode, submit voice to fal queue (non-blocking)
    const ttsRequestId = await submitVoice(script, body.voicePreset, body.voiceTuning);

    // Encode pipeline state so status endpoint can continue the pipeline
    const jobId = encodeJobId("tts", ttsRequestId, body);

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

/**
 * Encode pipeline state into a jobId string.
 * Format: phase:requestId:base64(params)
 */
function encodeJobId(phase: string, requestId: string, params: GenerateRequest): string {
  const pipelineData = {
    baseImageUrl: params.baseImageUrl,
    gestureMode: params.gestureMode,
    costume: params.costume,
    mouth: params.mouth,
    voicePreset: params.voicePreset,
    voiceTuning: params.voiceTuning,
    script: params.script || "",
    uploadedAudioUrl: params.uploadedAudioUrl,
    customPrompts: params.customPrompts,
  };
  const encoded = Buffer.from(JSON.stringify(pipelineData)).toString("base64url");
  return `${phase}:${requestId}:${encoded}`;
}
