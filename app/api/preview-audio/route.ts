import { NextResponse } from "next/server";
import { generateVoice } from "@/lib/eleven";
import { parseAnnotations } from "@/lib/scriptAnnotations";
import type { VoicePreset, VoiceTuning } from "@/types";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { script, voicePreset, voiceTuning } = body as {
      script: string;
      voicePreset: VoicePreset;
      voiceTuning: VoiceTuning;
    };

    if (!script?.trim()) {
      return NextResponse.json(
        { success: false, error: "Script is required" },
        { status: 400 }
      );
    }

    const parsed = parseAnnotations(script);
    if (!parsed.cleanScript) {
      return NextResponse.json(
        { success: false, error: "Script must contain spoken text" },
        { status: 400 }
      );
    }

    const audioUrl = await generateVoice(parsed.ttsText, voicePreset, voiceTuning);
    return NextResponse.json({ success: true, audioUrl });
  } catch (error) {
    console.error("Audio preview error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
