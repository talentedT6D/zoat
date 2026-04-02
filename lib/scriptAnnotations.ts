export interface ParsedScript {
  ttsText: string;
  gestureDirections: string;
  toneDirections: string;
  cleanScript: string;
}

const GESTURE_TAGS = ["wave", "point", "nod", "shrug"] as const;
const WRAPPER_TAGS = ["loud", "whisper", "slow"] as const;
const PAUSE_TAGS = ["pause", "long pause"] as const;

type GestureTag = (typeof GESTURE_TAGS)[number];
type WrapperTag = (typeof WRAPPER_TAGS)[number];

/**
 * Parse inline annotations from a raw script.
 * Returns cleaned text for TTS, gesture cues for Aurora, and tone cues for Aurora.
 */
export function parseAnnotations(rawScript: string): ParsedScript {
  let ttsText = rawScript;
  const gestures: { tag: GestureTag; position: "early" | "midway" | "late" }[] = [];
  const tones: { tag: WrapperTag; text: string }[] = [];

  // 1. Extract wrapper tags [loud]...[/loud], [whisper]...[/whisper], [slow]...[/slow]
  for (const tag of WRAPPER_TAGS) {
    const regex = new RegExp(`\\[${tag}\\](.*?)\\[\\/${tag}\\]`, "gi");
    ttsText = ttsText.replace(regex, (_match, content: string) => {
      tones.push({ tag: tag as WrapperTag, text: content.trim() });
      if (tag === "loud") {
        return content.toUpperCase();
      }
      // whisper and slow: just return text as-is for TTS (no audio effect)
      return content;
    });
  }

  // 2. Extract gesture tags [wave], [point], [nod], [shrug]
  for (const tag of GESTURE_TAGS) {
    const regex = new RegExp(`\\[${tag}\\]`, "gi");
    let match: RegExpExecArray | null;
    while ((match = regex.exec(ttsText)) !== null) {
      const relativePos = match.index / ttsText.length;
      const position = relativePos < 0.33 ? "early" : relativePos < 0.66 ? "midway" : "late";
      gestures.push({ tag: tag as GestureTag, position });
    }
    ttsText = ttsText.replace(regex, "");
  }

  // 3. Convert pause tags to natural punctuation
  ttsText = ttsText.replace(/\[long\s+pause\]/gi, ". ...");
  ttsText = ttsText.replace(/\[pause\]/gi, "...");

  // 4. Clean up extra whitespace
  ttsText = ttsText.replace(/\s{2,}/g, " ").trim();

  // 5. Build gesture directions string for Aurora prompt
  const gestureDirections = buildGestureDirections(gestures);

  // 6. Build tone directions string for Aurora prompt
  const toneDirections = buildToneDirections(tones);

  // 7. Clean script (all annotations stripped, for display/char counting)
  const cleanScript = stripAllAnnotations(rawScript);

  return { ttsText, gestureDirections, toneDirections, cleanScript };
}

function buildGestureDirections(
  gestures: { tag: GestureTag; position: string }[]
): string {
  if (gestures.length === 0) return "";

  const GESTURE_DESC: Record<GestureTag, string> = {
    wave: "waves hand",
    point: "points at camera",
    nod: "nods head",
    shrug: "shrugs shoulders",
  };

  const parts = gestures.map(
    (g) => `${GESTURE_DESC[g.tag]} ${g.position} in speech`
  );

  return `Gestures: ${parts.join(", ")}.`;
}

function buildToneDirections(
  tones: { tag: WrapperTag; text: string }[]
): string {
  if (tones.length === 0) return "";

  const TONE_DESC: Record<WrapperTag, string> = {
    loud: "delivers with intensity",
    whisper: "hushed intimate delivery",
    slow: "slows pace deliberately",
  };

  const parts = tones.map(
    (t) => `${TONE_DESC[t.tag]} for "${t.text.slice(0, 30)}"`
  );

  return `Delivery: ${parts.join("; ")}.`;
}

/**
 * Strip all annotation tags from script (for display/char counting)
 */
export function stripAllAnnotations(script: string): string {
  let clean = script;
  // Remove wrapper tags
  for (const tag of WRAPPER_TAGS) {
    clean = clean.replace(new RegExp(`\\[\\/?${tag}\\]`, "gi"), "");
  }
  // Remove gesture tags
  for (const tag of GESTURE_TAGS) {
    clean = clean.replace(new RegExp(`\\[${tag}\\]`, "gi"), "");
  }
  // Remove pause tags
  clean = clean.replace(/\[long\s+pause\]/gi, "");
  clean = clean.replace(/\[pause\]/gi, "");
  // Clean whitespace
  return clean.replace(/\s{2,}/g, " ").trim();
}
