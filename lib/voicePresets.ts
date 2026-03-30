import type { VoicePreset, VoicePresetConfig } from "@/types";

export const VOICE_PRESETS: Record<VoicePreset, VoicePresetConfig> = {
  sarcastic: {
    stability: 0.7,
    similarityBoost: 0.6,
    style: "sarcastic",
    description:
      "Slow, deliberate. Long pauses. Stress on unexpected words. Default ZAG delivery.",
    example: '"Oh wow. A nut. Incredible discovery."',
    klingTone:
      "Tone: Sarcastic, dry, controlled. Delivery: controlled, slightly slow.",
  },
  deadpan: {
    stability: 0.9,
    similarityBoost: 0.8,
    style: "deadpan",
    description:
      "Flat affect. Zero vocal variation. Reads like a government notice. No expression.",
    example: '"It is a snack. You eat it. Goodbye."',
    klingTone: "Tone: Flat, zero affect, robotic pace. No visible expression.",
  },
  hype: {
    stability: 0.3,
    similarityBoost: 0.5,
    style: "energetic",
    description:
      "Fast and punchy. Rising energy on every phrase. Maximum excitement.",
    example: '"THESE NUTS. ARE INSANE. EAT THEM NOW."',
    klingTone:
      "Tone: High energy, enthusiastic, fast. Punchy staccato cuts.",
  },
  whisper: {
    stability: 0.8,
    similarityBoost: 0.7,
    style: "soft",
    description:
      "Low, intimate. Close-mic feel. ASMR adjacent. Unexpectedly unsettling from a crocodile.",
    example: '"...you should probably eat these. just saying."',
    klingTone: "Tone: Hushed, intimate. Low volume. Minimal mouth movement.",
  },
  aggressive: {
    stability: 0.2,
    similarityBoost: 0.4,
    style: "aggressive",
    description:
      "Sharp, confrontational. Short sentences. Hard consonants. Zero warmth.",
    example: '"EAT. THE. NUTS. That is all."',
    klingTone:
      "Tone: Confrontational, sharp. Hard consonants. Zero warmth.",
  },
};
