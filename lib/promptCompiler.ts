import type {
  GestureMode,
  CostumeVariant,
  MouthMechanics,
  VoicePreset,
  VoiceTuning,
  AnimationConfig,
  CustomPrompts,
} from "@/types";

// === Costume Visual Rules ===
const COSTUME_RULES: Record<CostumeVariant, string> = {
  default: `Visual Rules:
  - Black full-body mascot suit (velvet)
  - White Mickey-style gloves
  - Must Be Nuts branded microphone
  - Fixed forward gaze, no eye movement`,

  chef: `Visual Rules:
  - White double-breasted chef coat, slightly oversized
  - Tall white chef toque (slightly crooked, comedic)
  - White Mickey-style gloves
  - Must Be Nuts branded microphone
  - Black crocodile foam head unchanged`,

  suit: `Visual Rules:
  - Black tailored blazer, single-button
  - White dress shirt, thin black tie
  - White Mickey-style gloves
  - Must Be Nuts mic (kept for identity)`,

  gym: `Visual Rules:
  - Red sleeveless gym tank (fitted)
  - Black athletic shorts, above-knee
  - White athletic sneakers
  - White Mickey-style gloves`,

  streetwear: `Visual Rules:
  - Oversized black graphic hoodie
  - Black slim jogger pants
  - White hi-top sneakers
  - White Mickey-style gloves`,

  festival: `Visual Rules:
  - Bright orange mesh festival vest
  - Sunglasses resting on snout
  - Badges and pins on vest
  - White Mickey-style gloves`,
};

// === Voice Preset → Kling Tone Mapping ===
const VOICE_TONE: Record<VoicePreset, string> = {
  sarcastic: "Sarcastic, dry, controlled. Delivery: controlled, slightly slow.",
  deadpan: "Flat, zero affect, robotic pace. No visible expression.",
  hype: "High energy, enthusiastic, fast. Punchy staccato cuts.",
  whisper: "Hushed, intimate. Low volume. Minimal mouth movement.",
  aggressive: "Confrontational, sharp. Hard consonants. Zero warmth.",
};

// === Mouth Mechanics → Prompt Injection ===
function compileMouthBlock(mouth: MouthMechanics): string {
  const widthDesc =
    mouth.openWidth <= 3
      ? "Snout barely opens — minimal phoneme shaping"
      : mouth.openWidth <= 7
        ? "Snout opens mid-range — clear phoneme shaping"
        : "Snout opens WIDE — cartoon-level mouth movement";

  const speedDesc =
    mouth.speed <= 3
      ? "Mouth mechanics slow — deliberate open/close"
      : mouth.speed <= 7
        ? "Mouth speed: natural conversational"
        : "Rapid mouth cycling — punchy staccato delivery";

  const closeDesc =
    mouth.jawClose <= 3
      ? "Jaw does not fully close between phrases"
      : mouth.jawClose <= 7
        ? "Jaw closes to resting position between phrases"
        : "Jaw FULLY CLOSES between phrases — hard stops";

  return `Mouth Mechanics:
  - ${widthDesc} [width: ${mouth.openWidth}/10]
  - ${closeDesc} [close force: ${mouth.jawClose}/10]
  - Exaggerated articulation [speed: ${mouth.speed}/10]`;
}

// === Gesture Rules ===
function compileGestureBlock(mode: GestureMode): string {
  if (mode === "A") {
    return `Gesture Rules (Type A):
  - No major movement during speech
  - Body locked, arms at sides
  - At end: pats head in frustration (single beat)
  - Eyes: fixed forward gaze
  - No neck tilt or lean`;
  }
  return `Gesture Rules (Type B):
  - Subtle hand gestures allowed
  - Slight neck movement permitted
  - Keep movement minimal
  - No full arm raises or jumps
  - Eyes: mostly fixed, blink OK`;
}

// === Animation Config ===
export function getAnimationConfig(mode: GestureMode): AnimationConfig {
  if (mode === "A") {
    return {
      mouth: "exaggerated",
      eyes: "fixed",
      body: "locked",
      gestures: "A",
      end_action: "head_pat",
    };
  }
  return {
    mouth: "exaggerated",
    eyes: "natural",
    body: "minimal",
    gestures: "B",
    neck_movement: "slight",
  };
}

// === Main Compiler ===
export function compilePrompt(params: {
  script: string;
  gestureMode: GestureMode;
  costume: CostumeVariant;
  mouth: MouthMechanics;
  voicePreset: VoicePreset;
  voiceTuning: VoiceTuning;
  customPrompts?: CustomPrompts;
}): string {
  const { script, gestureMode, costume, mouth, voicePreset, voiceTuning, customPrompts } =
    params;

  // Each block: use custom prompt if provided, otherwise use the preset
  const costumeBlock = customPrompts?.costume
    ? `Visual Rules (Custom):\n  ${customPrompts.costume}`
    : COSTUME_RULES[costume];

  const mouthBlock = customPrompts?.mouth
    ? `Mouth Mechanics (Custom):\n  ${customPrompts.mouth}`
    : compileMouthBlock(mouth);

  const voiceBlock = customPrompts?.voice
    ? `Tone (Custom):\n  ${customPrompts.voice}`
    : `Tone:\n  - ${VOICE_TONE[voicePreset]}`;

  const gestureBlock = customPrompts?.gesture
    ? `Gesture Rules (Custom):\n  ${customPrompts.gesture}`
    : compileGestureBlock(gestureMode);

  const blocks = [
    `Character: ZAG (crocodile mascot)`,
    costumeBlock,
    mouthBlock,
    voiceBlock,
    `Voice:\n  - Preset: ${voicePreset.charAt(0).toUpperCase() + voicePreset.slice(1)}   Stability: ${(voiceTuning.stability / 10).toFixed(1)}   Similarity boost: ${(voiceTuning.similarity / 10).toFixed(1)}`,
    gestureBlock,
    `Performance:\n  - Direct to camera   9:16 vertical   Green screen`,
    `Script:\n"${script}"`,
  ];

  return blocks.join("\n\n");
}
