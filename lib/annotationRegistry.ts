// ── Annotation Registry ──
// Single source of truth for all inline script annotations.
// To add a new annotation, just add an entry to REGISTRY below.

export type AnnotationType = "self-closing" | "wrapper";

export type TtsEffect =
  | "none"           // stripped from TTS, no audio change
  | "ellipsis"       // replaced with "..."
  | "long-ellipsis"  // replaced with ". ..."
  | "uppercase"      // wrapper content UPPERCASED
  | "passthrough";   // wrapper content left as-is

export type AnnotationCategory =
  | "pause"
  | "timing"
  | "voice"
  | "gesture"
  | "emotion"
  | "expression"
  | "camera"
  | "effect";

export interface AnnotationDef {
  tag: string;
  type: AnnotationType;
  category: AnnotationCategory;
  label: string;            // toolbar button text
  ttsEffect: TtsEffect;
  promptEffect: string;     // natural-language cue for the video model
  positionAware?: boolean;  // track early/midway/late position in script
}

// ── Full Registry ──

export const REGISTRY: AnnotationDef[] = [
  // Pause
  { tag: "pause",      type: "self-closing", category: "pause",  label: "Pause",      ttsEffect: "ellipsis",      promptEffect: "brief pause" },
  { tag: "long pause", type: "self-closing", category: "pause",  label: "Long Pause", ttsEffect: "long-ellipsis", promptEffect: "extended pause" },

  // Timing
  { tag: "beat",   type: "self-closing", category: "timing", label: "Beat",   ttsEffect: "ellipsis", promptEffect: "dramatic beat" },
  { tag: "breath", type: "self-closing", category: "timing", label: "Breath", ttsEffect: "ellipsis", promptEffect: "takes a breath" },

  // Voice (wrappers)
  { tag: "loud",    type: "wrapper", category: "voice", label: "LOUD",    ttsEffect: "uppercase",    promptEffect: "delivers with intensity" },
  { tag: "whisper", type: "wrapper", category: "voice", label: "Whisper", ttsEffect: "passthrough",  promptEffect: "hushed intimate delivery" },
  { tag: "slow",    type: "wrapper", category: "voice", label: "Slow",    ttsEffect: "passthrough",  promptEffect: "slows pace deliberately" },

  // Gesture
  { tag: "wave",      type: "self-closing", category: "gesture", label: "Wave",      ttsEffect: "none", promptEffect: "waves hand",           positionAware: true },
  { tag: "point",     type: "self-closing", category: "gesture", label: "Point",     ttsEffect: "none", promptEffect: "points at camera",      positionAware: true },
  { tag: "nod",       type: "self-closing", category: "gesture", label: "Nod",       ttsEffect: "none", promptEffect: "nods head",             positionAware: true },
  { tag: "shrug",     type: "self-closing", category: "gesture", label: "Shrug",     ttsEffect: "none", promptEffect: "shrugs shoulders",      positionAware: true },
  { tag: "lean-in",   type: "self-closing", category: "gesture", label: "Lean In",   ttsEffect: "none", promptEffect: "leans toward camera",   positionAware: true },
  { tag: "head-tilt", type: "self-closing", category: "gesture", label: "Head Tilt", ttsEffect: "none", promptEffect: "tilts head to the side", positionAware: true },

  // Emotion
  { tag: "happy",     type: "self-closing", category: "emotion", label: "Happy",     ttsEffect: "none", promptEffect: "shows happiness",    positionAware: true },
  { tag: "sad",       type: "self-closing", category: "emotion", label: "Sad",       ttsEffect: "none", promptEffect: "shows sadness",      positionAware: true },
  { tag: "angry",     type: "self-closing", category: "emotion", label: "Angry",     ttsEffect: "none", promptEffect: "shows anger",        positionAware: true },
  { tag: "excited",   type: "self-closing", category: "emotion", label: "Excited",   ttsEffect: "none", promptEffect: "shows excitement",   positionAware: true },
  { tag: "confused",  type: "self-closing", category: "emotion", label: "Confused",  ttsEffect: "none", promptEffect: "looks confused",     positionAware: true },
  { tag: "surprised", type: "self-closing", category: "emotion", label: "Surprised", ttsEffect: "none", promptEffect: "looks surprised",    positionAware: true },

  // Expression
  { tag: "smile",      type: "self-closing", category: "expression", label: "Smile",      ttsEffect: "none", promptEffect: "smiles",                positionAware: true },
  { tag: "frown",      type: "self-closing", category: "expression", label: "Frown",      ttsEffect: "none", promptEffect: "frowns",                positionAware: true },
  { tag: "wink",       type: "self-closing", category: "expression", label: "Wink",       ttsEffect: "none", promptEffect: "winks at camera",       positionAware: true },
  { tag: "eyeroll",    type: "self-closing", category: "expression", label: "Eyeroll",    ttsEffect: "none", promptEffect: "rolls eyes",            positionAware: true },
  { tag: "raised-brow", type: "self-closing", category: "expression", label: "Raised Brow", ttsEffect: "none", promptEffect: "raises eyebrow", positionAware: true },

  // Camera
  { tag: "zoom-in",  type: "self-closing", category: "camera", label: "Zoom In",  ttsEffect: "none", promptEffect: "camera zooms in",        positionAware: true },
  { tag: "zoom-out", type: "self-closing", category: "camera", label: "Zoom Out", ttsEffect: "none", promptEffect: "camera zooms out",       positionAware: true },
  { tag: "close-up", type: "self-closing", category: "camera", label: "Close-up", ttsEffect: "none", promptEffect: "extreme close-up shot",  positionAware: true },

  // Effect
  { tag: "shake",   type: "self-closing", category: "effect", label: "Shake",   ttsEffect: "none", promptEffect: "camera shake effect",   positionAware: true },
  { tag: "flash",   type: "self-closing", category: "effect", label: "Flash",   ttsEffect: "none", promptEffect: "bright flash effect",   positionAware: true },
  { tag: "sparkle", type: "self-closing", category: "effect", label: "Sparkle", ttsEffect: "none", promptEffect: "sparkle particle effect", positionAware: true },
];

// ── Derived Lookups ──

export const REGISTRY_BY_TAG = new Map<string, AnnotationDef>(
  REGISTRY.map((def) => [def.tag.toLowerCase(), def])
);

export const REGISTRY_BY_CATEGORY = new Map<AnnotationCategory, AnnotationDef[]>();
for (const def of REGISTRY) {
  const list = REGISTRY_BY_CATEGORY.get(def.category) ?? [];
  list.push(def);
  REGISTRY_BY_CATEGORY.set(def.category, list);
}

export const ALL_WRAPPER_TAGS = REGISTRY.filter((d) => d.type === "wrapper").map((d) => d.tag);
export const ALL_SELF_CLOSING_TAGS = REGISTRY.filter((d) => d.type === "self-closing").map((d) => d.tag);

// ── Toolbar category display order ──

export const TOOLBAR_CATEGORIES: { category: AnnotationCategory; label: string }[] = [
  { category: "pause",      label: "Pause" },
  { category: "timing",     label: "Timing" },
  { category: "voice",      label: "Audio" },
  { category: "gesture",    label: "Gesture" },
  { category: "emotion",    label: "Emotion" },
  { category: "expression", label: "Face" },
  { category: "camera",     label: "Camera" },
  { category: "effect",     label: "Effect" },
];

// ── Helpers ──

export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
