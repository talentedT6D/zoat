import { fal } from "@fal-ai/client";
import type { VoicePreset, VoiceTuning } from "@/types";

fal.config({ credentials: process.env.FAL_KEY! });

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

/**
 * Generate voice using fal.ai Chatterbox TTS
 * Uses expanded VoiceTuning for fine-grained control
 */
export async function generateVoice(
  script: string,
  voicePreset: VoicePreset,
  voiceTuning: VoiceTuning
): Promise<string> {
  const preset = PRESET_CONFIG[voicePreset];

  // User tuning overrides preset defaults
  const exaggeration = voiceTuning.exaggeration ?? preset.exaggeration;
  const temperature = Math.max(
    0.05,
    Math.min(2, ((10 - voiceTuning.stability) / 10) * 1.5 + 0.2)
  );
  const cfg = Math.max(0.1, Math.min(1, voiceTuning.cfg ?? voiceTuning.similarity / 10));

  const result = await fal.subscribe("fal-ai/chatterbox/text-to-speech", {
    input: {
      text: script,
      exaggeration,
      temperature,
      cfg,
      ...(preset.voice && { voice: preset.voice }),
    },
  });

  const data = result.data as { audio: { url: string } };
  return data.audio.url;
}
