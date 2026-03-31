// === Voice ===
export type VoicePreset = "sarcastic" | "deadpan" | "hype" | "whisper" | "aggressive";

export interface VoiceTuning {
  stability: number;
  similarity: number;
  speed: number;
  pitch: number;
  exaggeration: number;
  cfg: number;
}

export interface VoicePresetConfig {
  stability: number;
  similarityBoost: number;
  style: string;
  description: string;
  example: string;
  klingTone: string;
}

export type VoiceMode = "tts" | "upload";

// === Visual ===
export type GestureMode = "A" | "B";

export type CostumeVariant =
  | "default"
  | "chef"
  | "suit"
  | "gym"
  | "streetwear"
  | "festival";

export interface MouthMechanics {
  openWidth: number;
  speed: number;
  jawClose: number;
}

// === Animation ===
export interface AnimationConfig {
  mouth: string;
  eyes: string;
  body: string;
  gestures: string;
  end_action?: string;
  neck_movement?: string;
}

// === Custom Prompts ===
export interface CustomPrompts {
  costume?: string;
  mouth?: string;
  voice?: string;
  gesture?: string;
}

// === Job ===
export type JobStatus = "processing" | "done" | "failed";

// === History ===
export interface HistoryEntry {
  id: string;
  timestamp: number;
  videoUrl: string;
  script: string;
  voicePreset: VoicePreset;
  gestureMode: GestureMode;
  costume: CostumeVariant;
}

// === API ===
export interface GenerateRequest {
  script: string;
  gestureMode: GestureMode;
  costume: CostumeVariant;
  mouth: MouthMechanics;
  voicePreset: VoicePreset;
  voiceTuning: VoiceTuning;
  voiceMode: VoiceMode;
  baseImageUrl: string;
  uploadedAudioUrl?: string;
  customPrompts?: CustomPrompts;
}
