import { NextResponse } from "next/server";
import { checkVoiceStatus } from "@/lib/eleven";
import { submitAvatar, checkAvatarStatus } from "@/lib/klingAvatar";
import { compilePrompt, getAnimationConfig } from "@/lib/promptCompiler";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  try {
    const { phase, requestId, pipelineData } = decodeJobId(jobId);

    // Phase 1: TTS is processing
    if (phase === "tts") {
      const voiceResult = await checkVoiceStatus(requestId);

      if (voiceResult.status === "failed") {
        return NextResponse.json({
          status: "failed",
          error: voiceResult.error || "Voice generation failed",
        });
      }

      if (voiceResult.status === "done" && voiceResult.audioUrl) {
        // TTS done — submit avatar generation
        const prompt = compilePrompt({
          script: pipelineData.script || "",
          gestureMode: pipelineData.gestureMode,
          costume: pipelineData.costume,
          mouth: pipelineData.mouth,
          voicePreset: pipelineData.voicePreset,
          voiceTuning: pipelineData.voiceTuning,
          customPrompts: pipelineData.customPrompts,
        });

        const animation = getAnimationConfig(pipelineData.gestureMode);
        const avatarRequestId = await submitAvatar({
          imageUrl: pipelineData.baseImageUrl,
          audioUrl: voiceResult.audioUrl,
          prompt,
          animation,
        });

        // Return new jobId so client polls avatar phase next
        const newJobId = updateJobIdPhase(jobId, "avatar", avatarRequestId);
        return NextResponse.json({
          status: "processing",
          nextJobId: newJobId,
        });
      }

      // Still processing TTS
      return NextResponse.json({ status: "processing" });
    }

    // Phase 1b: Upload mode — submit avatar with uploaded audio
    if (phase === "avatar_pending") {
      const audioUrl = pipelineData.uploadedAudioUrl;
      if (!audioUrl) {
        return NextResponse.json({
          status: "failed",
          error: "No audio URL available",
        });
      }

      const prompt = compilePrompt({
        script: pipelineData.script || "",
        gestureMode: pipelineData.gestureMode,
        costume: pipelineData.costume,
        mouth: pipelineData.mouth,
        voicePreset: pipelineData.voicePreset,
        voiceTuning: pipelineData.voiceTuning,
        customPrompts: pipelineData.customPrompts,
      });

      const animation = getAnimationConfig(pipelineData.gestureMode);
      const avatarRequestId = await submitAvatar({
        imageUrl: pipelineData.baseImageUrl,
        audioUrl,
        prompt,
        animation,
      });

      const newJobId = updateJobIdPhase(jobId, "avatar", avatarRequestId);
      return NextResponse.json({
        status: "processing",
        nextJobId: newJobId,
      });
    }

    // Phase 2: Avatar is processing
    if (phase === "avatar") {
      const result = await checkAvatarStatus(requestId);
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { status: "failed", error: "Unknown pipeline phase" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Status check error:", error);
    return NextResponse.json(
      { status: "failed", error: "Failed to check job status" },
      { status: 500 }
    );
  }
}

import type {
  GestureMode,
  CostumeVariant,
  MouthMechanics,
  VoicePreset,
  VoiceTuning,
  CustomPrompts,
} from "@/types";

interface PipelineData {
  baseImageUrl: string;
  gestureMode: GestureMode;
  costume: CostumeVariant;
  mouth: MouthMechanics;
  voicePreset: VoicePreset;
  voiceTuning: VoiceTuning;
  script: string;
  uploadedAudioUrl?: string;
  customPrompts?: CustomPrompts;
}

function decodeJobId(jobId: string): {
  phase: string;
  requestId: string;
  pipelineData: PipelineData;
} {
  const firstColon = jobId.indexOf(":");
  const secondColon = jobId.indexOf(":", firstColon + 1);
  const phase = jobId.slice(0, firstColon);
  const requestId = jobId.slice(firstColon + 1, secondColon);
  const encoded = jobId.slice(secondColon + 1);
  const pipelineData = JSON.parse(
    Buffer.from(encoded, "base64url").toString()
  );
  return { phase, requestId, pipelineData };
}

function updateJobIdPhase(
  jobId: string,
  newPhase: string,
  newRequestId: string
): string {
  const secondColon = jobId.indexOf(":", jobId.indexOf(":") + 1);
  const encoded = jobId.slice(secondColon + 1);
  return `${newPhase}:${newRequestId}:${encoded}`;
}
