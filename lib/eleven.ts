import type { VoicePreset, VoiceTuning } from "@/types";
import type { AudioSegment } from "@/lib/scriptAnnotations";

const ELEVENLABS_VOICE_ID = "NGd6cAY3u3AiZhUL0IyV";
const ELEVENLABS_API_URL = `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`;

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
 * Generate voice from audio segments (speech + timed silence).
 * Calls ElevenLabs for speech segments, generates real silence for pause segments,
 * concatenates into one audio file.
 */
export async function generateVoice(
  scriptOrSegments: string | AudioSegment[],
  voicePreset: VoicePreset,
  voiceTuning: VoiceTuning
): Promise<string> {
  const apiKey = process.env.ELEVENLABS_API_KEY || "sk_78f658d2bdda6e71b032fd583d49b9ec205f50be3c1069d7";
  const preset = PRESET_CONFIG[voicePreset];
  const stability = voiceTuning.stability / 10;
  const similarity_boost = voiceTuning.similarity / 10;
  const style = preset.style;

  // If plain string (backward compat), generate directly
  const segments: AudioSegment[] = typeof scriptOrSegments === "string"
    ? [{ type: "speech", text: scriptOrSegments }]
    : scriptOrSegments;

  // If only one speech segment with no pauses, fast path
  if (segments.length === 1 && segments[0].type === "speech") {
    return generateAndUpload(segments[0].text, apiKey, stability, similarity_boost, style, preset.use_speaker_boost);
  }

  // Multi-segment: generate each piece and concatenate
  const audioChunks: ArrayBuffer[] = [];

  for (const seg of segments) {
    if (seg.type === "silence") {
      // Generate real silence: 44100 Hz, 16-bit mono WAV silence
      audioChunks.push(generateSilenceWav(seg.seconds));
    } else if (seg.text.trim()) {
      const buffer = await callElevenLabs(seg.text, apiKey, stability, similarity_boost, style, preset.use_speaker_boost);
      audioChunks.push(buffer);
    }
  }

  // Concatenate all chunks and upload
  const totalLength = audioChunks.reduce((sum, b) => sum + b.byteLength, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of audioChunks) {
    combined.set(new Uint8Array(chunk), offset);
    offset += chunk.byteLength;
  }

  const { fal } = await import("@fal-ai/client");
  fal.config({ credentials: process.env.FAL_KEY || "edc34a51-7f9f-4726-b931-3d6eca3986ea:79a3307eb88a467aa444213ec04d5632" });

  const audioFile = new File([combined], "voice.mp3", { type: "audio/mpeg" });
  return await fal.storage.upload(audioFile);
}

async function generateAndUpload(
  text: string, apiKey: string, stability: number, similarity_boost: number, style: number, use_speaker_boost: boolean
): Promise<string> {
  const buffer = await callElevenLabs(text, apiKey, stability, similarity_boost, style, use_speaker_boost);

  const { fal } = await import("@fal-ai/client");
  fal.config({ credentials: process.env.FAL_KEY || "edc34a51-7f9f-4726-b931-3d6eca3986ea:79a3307eb88a467aa444213ec04d5632" });

  const audioFile = new File([buffer], "voice.mp3", { type: "audio/mpeg" });
  return await fal.storage.upload(audioFile);
}

async function callElevenLabs(
  text: string, apiKey: string, stability: number, similarity_boost: number, style: number, use_speaker_boost: boolean
): Promise<ArrayBuffer> {
  const res = await fetch(ELEVENLABS_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "xi-api-key": apiKey },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability, similarity_boost, style, use_speaker_boost },
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
    throw new Error(`ElevenLabs API error (${res.status}): ${message}`);
  }

  return await res.arrayBuffer();
}

/**
 * Generate a WAV file containing silence of the specified duration.
 * 44100 Hz, 16-bit mono PCM.
 */
function generateSilenceWav(seconds: number): ArrayBuffer {
  const sampleRate = 44100;
  const numSamples = Math.round(sampleRate * Math.min(seconds, 30));
  const dataSize = numSamples * 2; // 16-bit = 2 bytes per sample
  const headerSize = 44;
  const buffer = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(buffer);

  // WAV header
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);          // chunk size
  view.setUint16(20, 1, true);           // PCM format
  view.setUint16(22, 1, true);           // mono
  view.setUint32(24, sampleRate, true);  // sample rate
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true);           // block align
  view.setUint16(34, 16, true);          // bits per sample
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);
  // Data is all zeros = silence (ArrayBuffer is zero-initialized)

  return buffer;
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
