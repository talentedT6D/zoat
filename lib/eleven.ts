import type { VoicePreset, VoiceTuning } from "@/types";

const ELEVENLABS_VOICE_ID = "NGd6cAY3u3AiZhUL0IyV";
const ELEVENLABS_API_URL = `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`;

// Map ZAG voice presets → ElevenLabs style parameters
const PRESET_CONFIG: Record<
  VoicePreset,
  { stability: number; similarity_boost: number; style: number; use_speaker_boost: boolean }
> = {
  sarcastic: { stability: 0.3, similarity_boost: 0.6, style: 0.5, use_speaker_boost: true },
  deadpan: { stability: 0.9, similarity_boost: 0.8, style: 0.1, use_speaker_boost: false },
  hype: { stability: 0.2, similarity_boost: 0.5, style: 0.8, use_speaker_boost: true },
  whisper: { stability: 0.7, similarity_boost: 0.7, style: 0.3, use_speaker_boost: false },
  aggressive: { stability: 0.15, similarity_boost: 0.4, style: 0.7, use_speaker_boost: true },
};

/**
 * Generate voice using ElevenLabs TTS API
 * Voice: Knightly (NGd6cAY3u3AiZhUL0IyV)
 * Supports SSML <break> tags for timed pauses from annotations
 */
export async function generateVoice(
  script: string,
  voicePreset: VoicePreset,
  voiceTuning: VoiceTuning
): Promise<string> {
  const apiKey = process.env.ELEVENLABS_API_KEY || "sk_78f658d2bdda6e71b032fd583d49b9ec205f50be3c1069d7";

  const preset = PRESET_CONFIG[voicePreset];

  // User tuning overrides preset defaults
  const stability = voiceTuning.stability / 10;
  const similarity_boost = voiceTuning.similarity / 10;
  const style = preset.style;

  // Wrap in SSML <speak> tags if the script contains break tags from annotations
  const hasBreaks = script.includes("<break ");
  const text = hasBreaks ? `<speak>${script}</speak>` : script;

  const res = await fetch(ELEVENLABS_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": apiKey,
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability,
        similarity_boost,
        style,
        use_speaker_boost: preset.use_speaker_boost,
      },
    }),
  });

  if (!res.ok) {
    let message: string;
    try {
      const err = await res.json();
      message = err?.detail?.message || err?.detail || JSON.stringify(err);
    } catch {
      message = await res.text();
    }
    const keyHint = `(key starts with ${apiKey.slice(0, 6)}...)`;
    throw new Error(`ElevenLabs API error (${res.status}): ${message} ${keyHint}`);
  }

  // ElevenLabs returns raw audio bytes — upload to fal storage for the avatar pipeline
  const { fal } = await import("@fal-ai/client");
  fal.config({ credentials: process.env.FAL_KEY || "edc34a51-7f9f-4726-b931-3d6eca3986ea:79a3307eb88a467aa444213ec04d5632" });

  const audioBuffer = await res.arrayBuffer();
  const audioFile = new File([audioBuffer], "voice.mp3", { type: "audio/mpeg" });
  const uploadedUrl = await fal.storage.upload(audioFile);

  return uploadedUrl;
}
