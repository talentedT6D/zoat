// ── Annotation Registry ──
// Single source of truth for all inline script annotations.
// To add a new annotation, just add an entry to REGISTRY below.
//
// Duration syntax: any tag supports optional `:Ns` or `:N.Ns` suffix
//   Self-closing: [wave:2s]  [pause:3s]  [zoom-in:1.5s]
//   Wrapper:      [slow:2s]text[/slow]

export type AnnotationType = "self-closing" | "wrapper";

export type TtsEffect =
  | "none"           // stripped from TTS, no audio change
  | "ellipsis"       // replaced with "..."
  | "long-ellipsis"  // replaced with ". ..."
  | "uppercase"      // wrapper content UPPERCASED
  | "whisper"        // lowercase + soft breathy punctuation
  | "slow-speech"    // commas between words to slow ElevenLabs
  | "fast-speech"    // strip punctuation, compact for speed
  | "mumble"         // lowercase, muffled style
  | "passthrough";   // wrapper content left as-is (prompt hint only)

export type AnnotationCategory =
  | "pause"
  | "timing"
  | "voice";

export interface AnnotationDef {
  tag: string;
  type: AnnotationType;
  category: AnnotationCategory;
  label: string;            // toolbar button text
  ttsEffect: TtsEffect;
  promptEffect: string;     // natural-language cue for the video model
  positionAware?: boolean;  // track early/midway/late position in script
  durationAllowed?: boolean; // supports :Ns duration suffix
  defaultDuration?: number;  // default duration in seconds when inserted from toolbar
  /** How reliably this annotation affects output:
   * "audio" = directly changes TTS audio (pauses, caps, etc.)
   * "strong" = Aurora responds well to this (basic movement, emotion)
   * "hint" = best-effort prompt hint, may not be visible */
  tier: "audio" | "strong" | "hint";
}

// ── Full Registry ──

export const REGISTRY: AnnotationDef[] = [
  // ═══════════════════════════════════════════════════════════
  // AUDIO TIER — these directly change what ElevenLabs produces
  // ═══════════════════════════════════════════════════════════

  // ── Pause (real silence in audio) ──
  { tag: "pause",      type: "self-closing", category: "pause", label: "Pause",      ttsEffect: "ellipsis",      promptEffect: "brief pause",    durationAllowed: true, defaultDuration: 1,  tier: "audio" },
  { tag: "long pause", type: "self-closing", category: "pause", label: "Long Pause", ttsEffect: "long-ellipsis", promptEffect: "extended pause",  durationAllowed: true, defaultDuration: 3,  tier: "audio" },
  { tag: "silence",    type: "self-closing", category: "pause", label: "Silence",    ttsEffect: "long-ellipsis", promptEffect: "silent moment",   durationAllowed: true, defaultDuration: 2,  tier: "audio" },

  // ── Timing (real pauses tied to delivery) ──
  { tag: "beat",      type: "self-closing", category: "timing", label: "Beat",      ttsEffect: "ellipsis", promptEffect: "dramatic beat",       durationAllowed: true, defaultDuration: 0.5, tier: "audio" },
  { tag: "breath",    type: "self-closing", category: "timing", label: "Breath",    ttsEffect: "ellipsis", promptEffect: "takes a breath",      durationAllowed: true, defaultDuration: 1,   tier: "audio" },
  { tag: "hesitate",  type: "self-closing", category: "timing", label: "Hesitate",  ttsEffect: "ellipsis", promptEffect: "hesitates briefly",   durationAllowed: true, defaultDuration: 1,   tier: "audio" },

  // ── Voice wrappers (real audio effect via per-segment voice settings) ──
  // :N = intensity 1-10 (default 5). e.g. [loud:8]text[/loud] = 80% loud
  { tag: "loud",     type: "wrapper", category: "voice", label: "LOUD",      ttsEffect: "uppercase",    promptEffect: "delivers with intensity",      durationAllowed: true, defaultDuration: 7,  tier: "audio" },
  { tag: "whisper",  type: "wrapper", category: "voice", label: "Whisper",   ttsEffect: "whisper",      promptEffect: "hushed intimate delivery",     durationAllowed: true, defaultDuration: 7,  tier: "audio" },
  { tag: "slow",     type: "wrapper", category: "voice", label: "Slow",      ttsEffect: "slow-speech",  promptEffect: "slows pace deliberately",      durationAllowed: true, defaultDuration: 5,  tier: "audio" },
  { tag: "fast",     type: "wrapper", category: "voice", label: "Fast",      ttsEffect: "fast-speech",  promptEffect: "speeds up delivery",           durationAllowed: true, tier: "audio" },
  { tag: "dramatic", type: "wrapper", category: "voice", label: "Dramatic",  ttsEffect: "uppercase",    promptEffect: "theatrical dramatic delivery",  durationAllowed: true, defaultDuration: 8,  tier: "audio" },
  { tag: "mumble",   type: "wrapper", category: "voice", label: "Mumble",    ttsEffect: "mumble",       promptEffect: "mumbles under breath",         durationAllowed: true, defaultDuration: 6,  tier: "audio" },
  { tag: "spell",    type: "wrapper", category: "voice", label: "Spell Out", ttsEffect: "slow-speech",  promptEffect: "spells out each word clearly",  durationAllowed: true, defaultDuration: 7,  tier: "audio" },

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
  { category: "voice",      label: "Voice" },
];

// ── Helpers ──

export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Duration pattern fragment: matches optional `:1s`, `:2.5s`, `:0.3s` */
/** Matches optional :N or :Ns suffix. e.g. :3, :1.5s, :10 */
export const DURATION_PATTERN = "(?::(\\d+(?:\\.\\d+)?)s?)?";
