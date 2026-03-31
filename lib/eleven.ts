import { fal } from "@/lib/fal";
import type { VoicePreset, VoiceTuning } from "@/types";

// Map ZAG voice presets → Chatterbox base parameters
const PRESET_CONFIG: Record<
  VoicePreset,
  { exaggeration: number; temperature: number; voice?: string }
> = {
  sarcastic: { exaggeration: 0.3, temperature: 0.6, voice: "gordon" },
  deadpan: { exaggeration: 0.1, temperature: 0.3, voice: "gordon" },
  hype: { exaggeration: 0.7, temperature: 0.9, voice: "archer" },
  whisper: { exaggeration: 0.15, temperature: 0.5, voice: "ivan" },
  aggressive: { exaggeration: 0.8, temperature: 0.8, voice: "brian" },
};

const TTS_ENDPOINT = "fal-ai/chatterbox/text-to-speech";

/**
 * Submit TTS to fal.ai queue (non-blocking).
 * Returns a request_id for polling.
 */
export async function submitVoice(
  script: string,
  voicePreset: VoicePreset,
  voiceTuning: VoiceTuning
): Promise<string> {
  const preset = PRESET_CONFIG[voicePreset];

  const exaggeration = voiceTuning.exaggeration ?? preset.exaggeration;
  const temperature = Math.max(
    0.05,
    Math.min(2, ((10 - voiceTuning.stability) / 10) * 1.5 + 0.2)
  );
  const cfg = Math.max(0.1, Math.min(1, voiceTuning.cfg ?? voiceTuning.similarity / 10));

  const { request_id } = await fal.queue.submit(TTS_ENDPOINT, {
    input: {
      text: script,
      exaggeration,
      temperature,
      cfg,
      ...(preset.voice && { voice: preset.voice }),
    },
  });

  return request_id;
}

/**
 * Check TTS status by polling fal.ai queue.
 */
export async function checkVoiceStatus(
  requestId: string
): Promise<{ status: string; audioUrl?: string; error?: string }> {
  const queueStatus = await fal.queue.status(TTS_ENDPOINT, {
    requestId,
    logs: false,
  });

  const s = queueStatus.status as string;

  if (s === "COMPLETED") {
    const result = await fal.queue.result(TTS_ENDPOINT, { requestId });
    const data = result.data as { audio: { url: string } };
    return { status: "done", audioUrl: data.audio.url };
  }

  if (s === "FAILED") {
    return { status: "failed", error: "Voice generation failed" };
  }

  return { status: "processing" };
}
