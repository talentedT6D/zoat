export type GestureMode = "A" | "B";

export type CostumeVariant =
  | "default"
  | "chef"
  | "suit"
  | "gym"
  | "streetwear"
  | "festival";

export type VoicePreset =
  | "sarcastic"
  | "deadpan"
  | "hype"
  | "whisper"
  | "aggressive";

export type VoiceMode = "tts" | "upload";

export type JobStatus = "processing" | "done" | "failed";

export interface MouthMechanics {
  openWidth: number;
  speed: number;
  jawClose: number;
}

export interface VoiceTuning {
  stability: number;
  similarity: number;
  speed: number;
  pitch: number;
  exaggeration: number;
  cfg: number;
}

export interface AnimationConfig {
  mouth: string;
  eyes: string;
  body: string;
  gestures: string;
  end_action?: string;
  neck_movement?: string;
}

export interface CustomPrompts {
  gesture?: string;
  costume?: string;
  voice?: string;
  mouth?: string;
}

export interface VoicePresetConfig {
  stability: number;
  similarityBoost: number;
  style: string;
  description: string;
  example: string;
  klingTone: string;
}

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
