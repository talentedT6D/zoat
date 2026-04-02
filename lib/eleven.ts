import type { VoicePreset, VoiceTuning } from "@/types";

const ELEVENLABS_VOICE_ID = "NGd6cAY3u3AiZhUL0IyV";
const ELEVENLABS_API_URL = `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}?output_format=pcm_44100`;

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

  const res = await fetch(ELEVENLABS_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": apiKey,
    },
    body: JSON.stringify({
      text: script,
      model_id: "eleven_turbo_v2_5",
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

  // ElevenLabs returns raw PCM — wrap in WAV header for Higgsfield
  const { fal } = await import("@fal-ai/client");
  fal.config({ credentials: process.env.FAL_KEY || "edc34a51-7f9f-4726-b931-3d6eca3986ea:79a3307eb88a467aa444213ec04d5632" });

  const pcmBuffer = await res.arrayBuffer();
  const wavBuffer = wrapPcmAsWav(pcmBuffer, 44100, 1, 16);
  const audioFile = new File([wavBuffer], "voice.wav", { type: "audio/wav" });
  const uploadedUrl = await fal.storage.upload(audioFile);

  return uploadedUrl;
}

/**
 * Wrap raw PCM data in a WAV header
 */
function wrapPcmAsWav(
  pcmData: ArrayBuffer,
  sampleRate: number,
  numChannels: number,
  bitsPerSample: number
): ArrayBuffer {
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmData.byteLength;
  const headerSize = 44;
  const buffer = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");

  // fmt chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data chunk
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  // Copy PCM data
  new Uint8Array(buffer, headerSize).set(new Uint8Array(pcmData));

  return buffer;
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
