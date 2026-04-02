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
  | "passthrough";   // wrapper content left as-is

export type AnnotationCategory =
  | "pause"
  | "timing"
  | "voice"
  | "gesture"
  | "emotion"
  | "expression"
  | "camera"
  | "effect"
  | "movement"
  | "gaze"
  | "transition";

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
}

// ── Full Registry ──

export const REGISTRY: AnnotationDef[] = [
  // ── Pause ──
  { tag: "pause",      type: "self-closing", category: "pause", label: "Pause",      ttsEffect: "ellipsis",      promptEffect: "brief pause",    durationAllowed: true, defaultDuration: 1 },
  { tag: "long pause", type: "self-closing", category: "pause", label: "Long Pause", ttsEffect: "long-ellipsis", promptEffect: "extended pause",  durationAllowed: true, defaultDuration: 3 },
  { tag: "silence",    type: "self-closing", category: "pause", label: "Silence",    ttsEffect: "long-ellipsis", promptEffect: "silent moment",   durationAllowed: true, defaultDuration: 2 },

  // ── Timing ──
  { tag: "beat",      type: "self-closing", category: "timing", label: "Beat",      ttsEffect: "ellipsis", promptEffect: "dramatic beat",       durationAllowed: true, defaultDuration: 0.5 },
  { tag: "breath",    type: "self-closing", category: "timing", label: "Breath",    ttsEffect: "ellipsis", promptEffect: "takes a breath",      durationAllowed: true, defaultDuration: 1 },
  { tag: "hesitate",  type: "self-closing", category: "timing", label: "Hesitate",  ttsEffect: "ellipsis", promptEffect: "hesitates briefly",   durationAllowed: true, defaultDuration: 1 },
  { tag: "stammer",   type: "self-closing", category: "timing", label: "Stammer",   ttsEffect: "ellipsis", promptEffect: "stammers nervously",  durationAllowed: true, defaultDuration: 1 },

  // ── Voice (wrappers) ──
  { tag: "loud",     type: "wrapper", category: "voice", label: "LOUD",     ttsEffect: "uppercase",   promptEffect: "delivers with intensity",    durationAllowed: true },
  { tag: "whisper",  type: "wrapper", category: "voice", label: "Whisper",  ttsEffect: "passthrough", promptEffect: "hushed intimate delivery",   durationAllowed: true },
  { tag: "slow",     type: "wrapper", category: "voice", label: "Slow",     ttsEffect: "passthrough", promptEffect: "slows pace deliberately",    durationAllowed: true },
  { tag: "fast",     type: "wrapper", category: "voice", label: "Fast",     ttsEffect: "passthrough", promptEffect: "speeds up delivery",         durationAllowed: true },
  { tag: "sing",     type: "wrapper", category: "voice", label: "Sing",     ttsEffect: "passthrough", promptEffect: "sings melodically",          durationAllowed: true },
  { tag: "mumble",   type: "wrapper", category: "voice", label: "Mumble",   ttsEffect: "passthrough", promptEffect: "mumbles under breath",       durationAllowed: true },
  { tag: "echo",     type: "wrapper", category: "voice", label: "Echo",     ttsEffect: "passthrough", promptEffect: "echoing reverb delivery",    durationAllowed: true },
  { tag: "robot",    type: "wrapper", category: "voice", label: "Robot",    ttsEffect: "passthrough", promptEffect: "robotic monotone delivery",  durationAllowed: true },

  // ── Gesture ──
  { tag: "wave",         type: "self-closing", category: "gesture", label: "Wave",         ttsEffect: "none", promptEffect: "waves hand",              positionAware: true, durationAllowed: true, defaultDuration: 1 },
  { tag: "point",        type: "self-closing", category: "gesture", label: "Point",        ttsEffect: "none", promptEffect: "points at camera",         positionAware: true, durationAllowed: true, defaultDuration: 1.5 },
  { tag: "nod",          type: "self-closing", category: "gesture", label: "Nod",          ttsEffect: "none", promptEffect: "nods head",                positionAware: true, durationAllowed: true, defaultDuration: 1 },
  { tag: "shrug",        type: "self-closing", category: "gesture", label: "Shrug",        ttsEffect: "none", promptEffect: "shrugs shoulders",         positionAware: true, durationAllowed: true, defaultDuration: 1.5 },
  { tag: "lean-in",      type: "self-closing", category: "gesture", label: "Lean In",      ttsEffect: "none", promptEffect: "leans toward camera",      positionAware: true, durationAllowed: true, defaultDuration: 2 },
  { tag: "head-tilt",    type: "self-closing", category: "gesture", label: "Head Tilt",    ttsEffect: "none", promptEffect: "tilts head to the side",   positionAware: true, durationAllowed: true, defaultDuration: 1 },
  { tag: "thumbs-up",    type: "self-closing", category: "gesture", label: "Thumbs Up",    ttsEffect: "none", promptEffect: "gives thumbs up",          positionAware: true, durationAllowed: true, defaultDuration: 1.5 },
  { tag: "clap",         type: "self-closing", category: "gesture", label: "Clap",         ttsEffect: "none", promptEffect: "claps hands",              positionAware: true, durationAllowed: true, defaultDuration: 1 },
  { tag: "finger-wag",   type: "self-closing", category: "gesture", label: "Finger Wag",   ttsEffect: "none", promptEffect: "wags finger",             positionAware: true, durationAllowed: true, defaultDuration: 1.5 },
  { tag: "hand-on-chin", type: "self-closing", category: "gesture", label: "Think Pose",   ttsEffect: "none", promptEffect: "hand on chin thinking",    positionAware: true, durationAllowed: true, defaultDuration: 2 },
  { tag: "arms-crossed", type: "self-closing", category: "gesture", label: "Arms Crossed", ttsEffect: "none", promptEffect: "crosses arms defiantly",   positionAware: true, durationAllowed: true, defaultDuration: 3 },
  { tag: "fist-pump",    type: "self-closing", category: "gesture", label: "Fist Pump",    ttsEffect: "none", promptEffect: "pumps fist in celebration", positionAware: true, durationAllowed: true, defaultDuration: 1 },

  // ── Emotion ──
  { tag: "happy",       type: "self-closing", category: "emotion", label: "Happy",       ttsEffect: "none", promptEffect: "shows happiness",        positionAware: true, durationAllowed: true, defaultDuration: 2 },
  { tag: "sad",         type: "self-closing", category: "emotion", label: "Sad",         ttsEffect: "none", promptEffect: "shows sadness",          positionAware: true, durationAllowed: true, defaultDuration: 2 },
  { tag: "angry",       type: "self-closing", category: "emotion", label: "Angry",       ttsEffect: "none", promptEffect: "shows anger",            positionAware: true, durationAllowed: true, defaultDuration: 2 },
  { tag: "excited",     type: "self-closing", category: "emotion", label: "Excited",     ttsEffect: "none", promptEffect: "shows excitement",       positionAware: true, durationAllowed: true, defaultDuration: 2 },
  { tag: "confused",    type: "self-closing", category: "emotion", label: "Confused",    ttsEffect: "none", promptEffect: "looks confused",         positionAware: true, durationAllowed: true, defaultDuration: 2 },
  { tag: "surprised",   type: "self-closing", category: "emotion", label: "Surprised",   ttsEffect: "none", promptEffect: "looks surprised",        positionAware: true, durationAllowed: true, defaultDuration: 1.5 },
  { tag: "scared",      type: "self-closing", category: "emotion", label: "Scared",      ttsEffect: "none", promptEffect: "looks frightened",       positionAware: true, durationAllowed: true, defaultDuration: 2 },
  { tag: "disgusted",   type: "self-closing", category: "emotion", label: "Disgusted",   ttsEffect: "none", promptEffect: "shows disgust",          positionAware: true, durationAllowed: true, defaultDuration: 2 },
  { tag: "proud",       type: "self-closing", category: "emotion", label: "Proud",       ttsEffect: "none", promptEffect: "beams with pride",       positionAware: true, durationAllowed: true, defaultDuration: 2 },
  { tag: "shy",         type: "self-closing", category: "emotion", label: "Shy",         ttsEffect: "none", promptEffect: "acts bashful and shy",    positionAware: true, durationAllowed: true, defaultDuration: 2 },
  { tag: "sarcastic",   type: "self-closing", category: "emotion", label: "Sarcastic",   ttsEffect: "none", promptEffect: "delivers sarcastically", positionAware: true, durationAllowed: true, defaultDuration: 2 },

  // ── Expression ──
  { tag: "smile",       type: "self-closing", category: "expression", label: "Smile",       ttsEffect: "none", promptEffect: "smiles",                positionAware: true, durationAllowed: true, defaultDuration: 2 },
  { tag: "frown",       type: "self-closing", category: "expression", label: "Frown",       ttsEffect: "none", promptEffect: "frowns",                positionAware: true, durationAllowed: true, defaultDuration: 2 },
  { tag: "wink",        type: "self-closing", category: "expression", label: "Wink",        ttsEffect: "none", promptEffect: "winks at camera",       positionAware: true, durationAllowed: true, defaultDuration: 0.5 },
  { tag: "eyeroll",     type: "self-closing", category: "expression", label: "Eyeroll",     ttsEffect: "none", promptEffect: "rolls eyes",            positionAware: true, durationAllowed: true, defaultDuration: 1 },
  { tag: "raised-brow", type: "self-closing", category: "expression", label: "Raised Brow", ttsEffect: "none", promptEffect: "raises eyebrow",        positionAware: true, durationAllowed: true, defaultDuration: 1.5 },
  { tag: "jaw-drop",    type: "self-closing", category: "expression", label: "Jaw Drop",    ttsEffect: "none", promptEffect: "drops jaw in shock",     positionAware: true, durationAllowed: true, defaultDuration: 1.5 },
  { tag: "lip-bite",    type: "self-closing", category: "expression", label: "Lip Bite",    ttsEffect: "none", promptEffect: "bites lip nervously",    positionAware: true, durationAllowed: true, defaultDuration: 1 },
  { tag: "tongue-out",  type: "self-closing", category: "expression", label: "Tongue Out",  ttsEffect: "none", promptEffect: "sticks tongue out",      positionAware: true, durationAllowed: true, defaultDuration: 1 },
  { tag: "smirk",       type: "self-closing", category: "expression", label: "Smirk",       ttsEffect: "none", promptEffect: "smirks knowingly",       positionAware: true, durationAllowed: true, defaultDuration: 2 },

  // ── Gaze / Eyes ──
  { tag: "look-left",    type: "self-closing", category: "gaze", label: "Look Left",    ttsEffect: "none", promptEffect: "glances to the left",      positionAware: true, durationAllowed: true, defaultDuration: 1.5 },
  { tag: "look-right",   type: "self-closing", category: "gaze", label: "Look Right",   ttsEffect: "none", promptEffect: "glances to the right",     positionAware: true, durationAllowed: true, defaultDuration: 1.5 },
  { tag: "look-up",      type: "self-closing", category: "gaze", label: "Look Up",      ttsEffect: "none", promptEffect: "looks upward",             positionAware: true, durationAllowed: true, defaultDuration: 1.5 },
  { tag: "look-down",    type: "self-closing", category: "gaze", label: "Look Down",    ttsEffect: "none", promptEffect: "looks downward",            positionAware: true, durationAllowed: true, defaultDuration: 1.5 },
  { tag: "look-away",    type: "self-closing", category: "gaze", label: "Look Away",    ttsEffect: "none", promptEffect: "looks away from camera",    positionAware: true, durationAllowed: true, defaultDuration: 2 },
  { tag: "eye-contact",  type: "self-closing", category: "gaze", label: "Eye Contact",  ttsEffect: "none", promptEffect: "locks eyes with camera",    positionAware: true, durationAllowed: true, defaultDuration: 3 },
  { tag: "blink",        type: "self-closing", category: "gaze", label: "Blink",        ttsEffect: "none", promptEffect: "blinks deliberately",       positionAware: true, durationAllowed: true, defaultDuration: 0.3 },
  { tag: "squint",       type: "self-closing", category: "gaze", label: "Squint",       ttsEffect: "none", promptEffect: "squints suspiciously",      positionAware: true, durationAllowed: true, defaultDuration: 2 },

  // ── Camera ──
  { tag: "zoom-in",     type: "self-closing", category: "camera", label: "Zoom In",     ttsEffect: "none", promptEffect: "camera zooms in",        positionAware: true, durationAllowed: true, defaultDuration: 2 },
  { tag: "zoom-out",    type: "self-closing", category: "camera", label: "Zoom Out",    ttsEffect: "none", promptEffect: "camera zooms out",       positionAware: true, durationAllowed: true, defaultDuration: 2 },
  { tag: "close-up",    type: "self-closing", category: "camera", label: "Close-up",    ttsEffect: "none", promptEffect: "extreme close-up shot",  positionAware: true, durationAllowed: true, defaultDuration: 3 },
  { tag: "pan-left",    type: "self-closing", category: "camera", label: "Pan Left",    ttsEffect: "none", promptEffect: "camera pans left",       positionAware: true, durationAllowed: true, defaultDuration: 2 },
  { tag: "pan-right",   type: "self-closing", category: "camera", label: "Pan Right",   ttsEffect: "none", promptEffect: "camera pans right",      positionAware: true, durationAllowed: true, defaultDuration: 2 },
  { tag: "tilt-up",     type: "self-closing", category: "camera", label: "Tilt Up",     ttsEffect: "none", promptEffect: "camera tilts upward",    positionAware: true, durationAllowed: true, defaultDuration: 2 },
  { tag: "tilt-down",   type: "self-closing", category: "camera", label: "Tilt Down",   ttsEffect: "none", promptEffect: "camera tilts downward",  positionAware: true, durationAllowed: true, defaultDuration: 2 },
  { tag: "dutch-angle",  type: "self-closing", category: "camera", label: "Dutch Angle",  ttsEffect: "none", promptEffect: "camera tilts to dutch angle", positionAware: true, durationAllowed: true, defaultDuration: 3 },
  { tag: "dolly-in",    type: "self-closing", category: "camera", label: "Dolly In",    ttsEffect: "none", promptEffect: "camera dollies forward slowly", positionAware: true, durationAllowed: true, defaultDuration: 3 },

  // ── Movement / Body ──
  { tag: "step-forward",  type: "self-closing", category: "movement", label: "Step Fwd",    ttsEffect: "none", promptEffect: "steps forward toward camera",  positionAware: true, durationAllowed: true, defaultDuration: 1.5 },
  { tag: "step-back",     type: "self-closing", category: "movement", label: "Step Back",   ttsEffect: "none", promptEffect: "steps backward from camera",   positionAware: true, durationAllowed: true, defaultDuration: 1.5 },
  { tag: "turn-around",   type: "self-closing", category: "movement", label: "Turn Around", ttsEffect: "none", promptEffect: "turns around",                 positionAware: true, durationAllowed: true, defaultDuration: 2 },
  { tag: "sit-down",      type: "self-closing", category: "movement", label: "Sit Down",    ttsEffect: "none", promptEffect: "sits down",                    positionAware: true, durationAllowed: true, defaultDuration: 2 },
  { tag: "stand-up",      type: "self-closing", category: "movement", label: "Stand Up",    ttsEffect: "none", promptEffect: "stands up",                    positionAware: true, durationAllowed: true, defaultDuration: 2 },
  { tag: "dance",         type: "self-closing", category: "movement", label: "Dance",       ttsEffect: "none", promptEffect: "does a dance move",            positionAware: true, durationAllowed: true, defaultDuration: 3 },
  { tag: "jump",          type: "self-closing", category: "movement", label: "Jump",        ttsEffect: "none", promptEffect: "jumps in place",               positionAware: true, durationAllowed: true, defaultDuration: 1 },
  { tag: "bow",           type: "self-closing", category: "movement", label: "Bow",         ttsEffect: "none", promptEffect: "takes a bow",                  positionAware: true, durationAllowed: true, defaultDuration: 2 },
  { tag: "spin",          type: "self-closing", category: "movement", label: "Spin",        ttsEffect: "none", promptEffect: "spins around once",            positionAware: true, durationAllowed: true, defaultDuration: 1.5 },

  // ── Effect ──
  { tag: "shake",       type: "self-closing", category: "effect", label: "Shake",       ttsEffect: "none", promptEffect: "camera shake effect",      positionAware: true, durationAllowed: true, defaultDuration: 1 },
  { tag: "flash",       type: "self-closing", category: "effect", label: "Flash",       ttsEffect: "none", promptEffect: "bright flash effect",      positionAware: true, durationAllowed: true, defaultDuration: 0.5 },
  { tag: "sparkle",     type: "self-closing", category: "effect", label: "Sparkle",     ttsEffect: "none", promptEffect: "sparkle particle effect",  positionAware: true, durationAllowed: true, defaultDuration: 2 },
  { tag: "blur",        type: "self-closing", category: "effect", label: "Blur",        ttsEffect: "none", promptEffect: "blur focus effect",        positionAware: true, durationAllowed: true, defaultDuration: 1.5 },
  { tag: "glitch",      type: "self-closing", category: "effect", label: "Glitch",      ttsEffect: "none", promptEffect: "digital glitch effect",    positionAware: true, durationAllowed: true, defaultDuration: 1 },
  { tag: "freeze",      type: "self-closing", category: "effect", label: "Freeze",      ttsEffect: "none", promptEffect: "freeze frame effect",      positionAware: true, durationAllowed: true, defaultDuration: 2 },
  { tag: "slow-mo",     type: "self-closing", category: "effect", label: "Slow Mo",     ttsEffect: "none", promptEffect: "slow motion effect",       positionAware: true, durationAllowed: true, defaultDuration: 3 },
  { tag: "vignette",    type: "self-closing", category: "effect", label: "Vignette",    ttsEffect: "none", promptEffect: "dark vignette edges",      positionAware: true, durationAllowed: true, defaultDuration: 3 },
  { tag: "spotlight",   type: "self-closing", category: "effect", label: "Spotlight",   ttsEffect: "none", promptEffect: "spotlight focus on face",   positionAware: true, durationAllowed: true, defaultDuration: 3 },

  // ── Transition ──
  { tag: "fade-in",     type: "self-closing", category: "transition", label: "Fade In",     ttsEffect: "none", promptEffect: "fades in from black",     positionAware: true, durationAllowed: true, defaultDuration: 1.5 },
  { tag: "fade-out",    type: "self-closing", category: "transition", label: "Fade Out",    ttsEffect: "none", promptEffect: "fades out to black",      positionAware: true, durationAllowed: true, defaultDuration: 1.5 },
  { tag: "cut-to-black", type: "self-closing", category: "transition", label: "Cut Black",  ttsEffect: "none", promptEffect: "hard cut to black",       positionAware: true, durationAllowed: true, defaultDuration: 1 },
  { tag: "flash-white", type: "self-closing", category: "transition", label: "Flash White", ttsEffect: "none", promptEffect: "white flash transition",  positionAware: true, durationAllowed: true, defaultDuration: 0.5 },
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
  { category: "gaze",       label: "Eyes" },
  { category: "movement",   label: "Body" },
  { category: "camera",     label: "Camera" },
  { category: "effect",     label: "FX" },
  { category: "transition", label: "Trans" },
];

// ── Helpers ──

export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Duration pattern fragment: matches optional `:1s`, `:2.5s`, `:0.3s` */
export const DURATION_PATTERN = "(?::(\\d+(?:\\.\\d+)?)s)?";
