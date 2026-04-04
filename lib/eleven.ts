import type { VoicePreset, VoiceTuning } from "@/types";
import type { AudioSegment, VoiceOverride } from "@/lib/scriptAnnotations";

const ELEVENLABS_VOICE_ID = "NGd6cAY3u3AiZhUL0IyV";

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
 * Uses PCM format so we can insert exact silence between speech chunks,
 * then wraps everything in a WAV container.
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

  const segments: AudioSegment[] = typeof scriptOrSegments === "string"
    ? [{ type: "speech", text: scriptOrSegments }]
    : scriptOrSegments;

  // Check if we have any silence segments
  const hasSilence = segments.some(s => s.type === "silence");

  if (!hasSilence) {
    // No pauses — use MP3 directly (best quality, fast)
    const speechText = segments.filter(s => s.type === "speech").map(s => (s as { text: string }).text).join(" ");
    return generateMp3AndUpload(speechText, apiKey, stability, similarity_boost, style, preset.use_speaker_boost);
  }

  // Has pauses — use PCM format so we can insert exact silence
  const pcmChunks: Int16Array[] = [];
  const sampleRate = 22050; // ElevenLabs PCM output rate

  for (const seg of segments) {
    if (seg.type === "silence") {
      // Generate exact silence: zeros = silence in PCM
      const clamped = Math.min(seg.seconds, 30);
      const numSamples = Math.round(sampleRate * clamped);
      pcmChunks.push(new Int16Array(numSamples)); // zeros = silence
    } else if (seg.text.trim()) {
      const vo: VoiceOverride | undefined = seg.type === "speech" ? seg.voiceOverride : undefined;
      const pcmBuffer = await callElevenLabsPcm(
        seg.text, apiKey,
        vo?.stability ?? stability,
        vo?.similarity_boost ?? similarity_boost,
        vo?.style ?? style,
        preset.use_speaker_boost
      );
      const samples = new Int16Array(pcmBuffer);

      // Apply volume change in dB if specified
      if (vo?.volumeDb && vo.volumeDb !== 0) {
        const multiplier = Math.pow(10, vo.volumeDb / 20); // dB to linear
        for (let i = 0; i < samples.length; i++) {
          const val = Math.round(samples[i] * multiplier);
          samples[i] = Math.max(-32768, Math.min(32767, val)); // clamp to 16-bit
        }
      }

      pcmChunks.push(samples);
    }
  }

  // Concatenate all PCM chunks
  const totalSamples = pcmChunks.reduce((sum, c) => sum + c.length, 0);
  const combined = new Int16Array(totalSamples);
  let offset = 0;
  for (const chunk of pcmChunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }

  // Wrap in WAV container
  const wavBuffer = createWav(combined, sampleRate);

  // Upload
  const { fal } = await import("@fal-ai/client");
  fal.config({ credentials: process.env.FAL_KEY || "edc34a51-7f9f-4726-b931-3d6eca3986ea:79a3307eb88a467aa444213ec04d5632" });

  const audioFile = new File([wavBuffer], "voice.wav", { type: "audio/wav" });
  return await fal.storage.upload(audioFile);
}

/** Generate MP3 via ElevenLabs and upload (no-pause fast path) */
async function generateMp3AndUpload(
  text: string, apiKey: string, stability: number, similarity_boost: number, style: number, use_speaker_boost: boolean
): Promise<string> {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "xi-api-key": apiKey },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability, similarity_boost, style, use_speaker_boost },
    }),
  });

  if (!res.ok) throw new Error(`ElevenLabs error (${res.status}): ${await getErrorMsg(res)}`);

  const { fal } = await import("@fal-ai/client");
  fal.config({ credentials: process.env.FAL_KEY || "edc34a51-7f9f-4726-b931-3d6eca3986ea:79a3307eb88a467aa444213ec04d5632" });

  const buffer = await res.arrayBuffer();
  const audioFile = new File([buffer], "voice.mp3", { type: "audio/mpeg" });
  return await fal.storage.upload(audioFile);
}

/** Call ElevenLabs with PCM output format for raw audio data */
async function callElevenLabsPcm(
  text: string, apiKey: string, stability: number, similarity_boost: number, style: number, use_speaker_boost: boolean
): Promise<ArrayBuffer> {
  // Use pcm_22050 output format — raw 16-bit PCM at 22050 Hz
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}?output_format=pcm_22050`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "xi-api-key": apiKey },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability, similarity_boost, style, use_speaker_boost },
    }),
  });

  if (!res.ok) throw new Error(`ElevenLabs error (${res.status}): ${await getErrorMsg(res)}`);
  return await res.arrayBuffer();
}

/** Create a WAV file from raw PCM Int16 samples */
function createWav(samples: Int16Array, sampleRate: number): ArrayBuffer {
  const dataSize = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF header
  writeStr(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(view, 8, "WAVE");

  // fmt chunk
  writeStr(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);           // PCM
  view.setUint16(22, 1, true);           // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);

  // data chunk
  writeStr(view, 36, "data");
  view.setUint32(40, dataSize, true);

  // Copy PCM samples
  const output = new Int16Array(buffer, 44);
  output.set(samples);

  return buffer;
}

function writeStr(view: DataView, offset: number, s: string) {
  for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
}

async function getErrorMsg(res: Response): Promise<string> {
  try {
    const err = await res.json();
    return err?.detail?.message || err?.detail || JSON.stringify(err);
  } catch {
    return await res.text();
  }
}
