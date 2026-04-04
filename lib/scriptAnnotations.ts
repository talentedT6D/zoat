import {
  REGISTRY,
  ALL_WRAPPER_TAGS,
  ALL_SELF_CLOSING_TAGS,
  DURATION_PATTERN,
  escapeRegex,
  type AnnotationDef,
  type AnnotationCategory,
} from "./annotationRegistry";

export interface ParsedCue {
  def: AnnotationDef;
  position?: "early" | "midway" | "late";
  text?: string;      // for wrapper tags
  duration?: number;   // seconds, from :Ns suffix
}

export type VoiceOverride = {
  stability?: number;
  similarity_boost?: number;
  style?: number;
  volumeDb?: number; // actual volume change in dB applied to PCM samples
};

export type AudioSegment =
  | { type: "speech"; text: string; voiceOverride?: VoiceOverride }
  | { type: "silence"; seconds: number };

export interface ParsedScript {
  ttsText: string;
  segments: AudioSegment[];
  gestureDirections: string;
  toneDirections: string;
  cleanScript: string;
  cuesByCategory: Partial<Record<AnnotationCategory, ParsedCue[]>>;
}

/** Placeholder token for pauses in ttsText — replaced by real silence in audio generation */
const PAUSE_TOKEN = "<<PAUSE:";
const PAUSE_TOKEN_END = ">>";

function generatePauseText(seconds: number): string {
  return `${PAUSE_TOKEN}${seconds}${PAUSE_TOKEN_END}`;
}

/**
 * Scale voice settings by intensity (1-10).
 * At intensity 1: barely different from normal.
 * At intensity 10: maximum effect.
 */
function scaleVoiceOverride(type: string, intensity: number): VoiceOverride {
  const t = intensity / 10; // 0.1 to 1.0

  switch (type) {
    case "loud":
      // Boost volume + more expressive delivery
      return {
        stability: 0.7 - (t * 0.4), style: 0.3 + (t * 0.5),
        volumeDb: t * 20,  // +2dB to +20dB actual volume boost
      };
    case "whisper":
      // Reduce volume + stable quiet delivery
      return {
        stability: 0.5 + (t * 0.4), style: 0.3 - (t * 0.25),
        volumeDb: -(t * 25),  // -2.5dB to -25dB actual volume reduction
      };
    case "slow":
      return { stability: 0.5 + (t * 0.45), similarity_boost: 0.7, style: 0.2 - (t * 0.15) };
    case "mumble":
      return {
        stability: 0.5 - (t * 0.3), similarity_boost: 0.5 - (t * 0.2), style: 0.2 + (t * 0.2),
        volumeDb: -(t * 10),  // slight volume reduction for mumble
      };
    default:
      return {};
  }
}

/**
 * Split ttsText into segments of speech, silence, and voice-modified speech.
 * Pause tokens <<PAUSE:6>> become silence segments.
 * Voice tokens <<VOICE:whisper:8>>text<<ENDVOICE>> become speech with scaled voice overrides.
 */
export function splitIntoSegments(ttsText: string): AudioSegment[] {
  const segments: AudioSegment[] = [];
  const regex = /<<PAUSE:([\d.]+)>>|<<VOICE:(\w+):([\d.]+)>>(.*?)<<ENDVOICE>>/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(ttsText)) !== null) {
    const before = ttsText.slice(lastIndex, match.index).trim();
    if (before) segments.push({ type: "speech", text: before });

    if (match[1]) {
      segments.push({ type: "silence", seconds: parseFloat(match[1]) });
    } else if (match[2] && match[4]) {
      const voiceType = match[2];
      const intensity = parseFloat(match[3]);
      const text = match[4].trim();
      if (text) {
        segments.push({
          type: "speech",
          text,
          voiceOverride: scaleVoiceOverride(voiceType, intensity),
        });
      }
    }

    lastIndex = match.index + match[0].length;
  }

  const after = ttsText.slice(lastIndex).trim();
  if (after) segments.push({ type: "speech", text: after });

  return segments.length > 0 ? segments : [{ type: "speech", text: ttsText }];
}

/**
 * Parse inline annotations from a raw script.
 * Data-driven from the annotation registry — supports any registered tag.
 * Supports optional duration syntax: [tag:2s], [tag:1.5s]
 */
export function parseAnnotations(rawScript: string): ParsedScript {
  let ttsText = rawScript;
  const cues: ParsedCue[] = [];

  // 1. Process wrapper tags first (e.g. [loud]text[/loud] or [loud:2s]text[/loud])
  const wrappers = REGISTRY.filter((d) => d.type === "wrapper");
  for (const def of wrappers) {
    const esc = escapeRegex(def.tag);
    // Match [tag] or [tag:Ns] ... [/tag]
    const regex = new RegExp(`\\[${esc}${DURATION_PATTERN}\\](.*?)\\[\\/${esc}\\]`, "gi");
    ttsText = ttsText.replace(regex, (_match, valStr: string | undefined, unit: string | undefined, content: string) => {
      // For wrappers: dB value → convert to 1-10 intensity. No unit → treat as raw intensity.
      let intensity = 5;
      if (valStr) {
        const val = parseFloat(valStr);
        if (unit === "dB") {
          // dB scale: map absolute value to intensity 1-10
          // +10dB loud → intensity 7.5, +20dB → intensity 10
          // -10dB whisper → intensity 7.5, -20dB → intensity 10
          // The sign determines loud vs whisper (handled by the tag type)
          // The magnitude determines how extreme the effect is
          intensity = Math.min(10, Math.max(1, Math.abs(val) / 2));
        } else {
          // Raw number: treat as 1-10 intensity
          intensity = Math.min(10, Math.max(1, val));
        }
      }
      cues.push({ def, text: content.trim(), duration: intensity });
      switch (def.ttsEffect) {
        case "uppercase":
          return `<<VOICE:loud:${intensity}>>${content.toUpperCase()}<<ENDVOICE>>`;
        case "whisper":
          return `<<VOICE:whisper:${intensity}>>${content.toLowerCase().trim()}<<ENDVOICE>>`;
        case "slow-speech":
          return `<<VOICE:slow:${intensity}>>${content.trim()}<<ENDVOICE>>`;
        case "fast-speech":
          return content.replace(/[.,;:!?\-—–()]/g, " ").replace(/\s+/g, " ").trim();
        case "mumble":
          return `<<VOICE:mumble:${intensity}>>${content.toLowerCase().trim()}<<ENDVOICE>>`;
        case "passthrough":
          return content;
        default:
          return content;
      }
    });
  }

  // 2. Process self-closing tags (gestures, emotions, camera, effects, pauses, timing)
  const selfClosing = REGISTRY.filter((d) => d.type === "self-closing");
  for (const def of selfClosing) {
    const esc = escapeRegex(def.tag);
    // Match [tag] or [tag:Ns]
    const patternStr = `\\[${esc}${DURATION_PATTERN}\\]`;
    const regex = new RegExp(patternStr, "gi");

    // Collect cues before stripping
    const findRegex = new RegExp(patternStr, "gi");
    let match: RegExpExecArray | null;
    while ((match = findRegex.exec(ttsText)) !== null) {
      const duration = match[1] ? parseFloat(match[1]) : undefined;
      if (def.positionAware) {
        const rel = ttsText.length > 0 ? match.index / ttsText.length : 0;
        const position = rel < 0.33 ? "early" : rel < 0.66 ? "midway" : "late";
        cues.push({ def, position, duration });
      } else {
        cues.push({ def, duration });
      }
    }

    // Apply TTS effect then strip
    switch (def.ttsEffect) {
      case "ellipsis": {
        ttsText = ttsText.replace(regex, (_m, valStr: string | undefined) => {
          const dur = valStr ? parseFloat(valStr) : (def.defaultDuration ?? 1);
          return generatePauseText(dur);
        });
        break;
      }
      case "long-ellipsis": {
        ttsText = ttsText.replace(regex, (_m, valStr: string | undefined) => {
          const dur = valStr ? parseFloat(valStr) : (def.defaultDuration ?? 3);
          return generatePauseText(dur);
        });
        break;
      }
      default:
        ttsText = ttsText.replace(regex, "");
        break;
    }
  }

  // 3. Clean up whitespace — preserve ". " pause patterns
  ttsText = ttsText
    .replace(/[ \t]{2,}/g, " ")  // collapse spaces/tabs but not the ". " pattern
    .replace(/\n{2,}/g, "\n")     // collapse newlines
    .trim();

  // 4. Group cues by category
  const cuesByCategory: Partial<Record<AnnotationCategory, ParsedCue[]>> = {};
  for (const cue of cues) {
    const cat = cue.def.category;
    (cuesByCategory[cat] ??= []).push(cue);
  }

  // 5. Build legacy direction strings (backward compat)
  const gestureDirections = "";
  const toneDirections = buildWrapperDirections(cuesByCategory["voice"]);

  // 6. Clean script for display/char counting
  const cleanScript = stripAllAnnotations(rawScript);

  const segments = splitIntoSegments(ttsText);

  return { ttsText, segments, gestureDirections, toneDirections, cleanScript, cuesByCategory };
}

function formatDuration(dur?: number): string {
  if (dur == null) return "";
  return ` for ${dur}s`;
}

function buildCategoryDirections(cues?: ParsedCue[]): string {
  if (!cues || cues.length === 0) return "";
  const parts = cues.map(
    (c) => `${c.def.promptEffect}${formatDuration(c.duration)}${c.position ? ` ${c.position} in speech` : ""}`
  );
  return `Gestures: ${parts.join(", ")}.`;
}

function buildWrapperDirections(cues?: ParsedCue[]): string {
  if (!cues || cues.length === 0) return "";
  const parts = cues.map(
    (c) => `${c.def.promptEffect}${formatDuration(c.duration)} for "${(c.text ?? "").slice(0, 30)}"`
  );
  return `Delivery: ${parts.join("; ")}.`;
}

/**
 * Build a multi-line directions block from all annotation categories.
 * Used by the prompt compiler for richer video model guidance.
 */
export function buildAllDirections(
  cuesByCategory: Partial<Record<AnnotationCategory, ParsedCue[]>>
): string {
  const CATEGORY_LABELS: Record<AnnotationCategory, string> = {
    pause: "Pauses",
    timing: "Timing",
    voice: "Delivery",
  };

  const lines: string[] = [];

  for (const [cat, label] of Object.entries(CATEGORY_LABELS) as [AnnotationCategory, string][]) {
    const cues = cuesByCategory[cat];
    if (!cues || cues.length === 0) continue;

    let line: string;
    if (cat === "voice") {
      const parts = cues.map(
        (c) => `${c.def.promptEffect}${formatDuration(c.duration)} for "${(c.text ?? "").slice(0, 30)}"`
      );
      line = `${label}: ${parts.join("; ")}`;
    } else {
      const parts = cues.map((c) => {
        let s = c.def.promptEffect;
        if (c.duration != null) s += ` for ${c.duration}s`;
        if (c.position) s += ` ${c.position} in speech`;
        return s;
      });
      line = `${label}: ${parts.join(", ")}`;
    }

    lines.push(`  - ${line.slice(0, 250)}`);
  }

  return lines.length > 0 ? `Inline Cues:\n${lines.join("\n")}` : "";
}

/**
 * Strip all annotation tags from script (for display/char counting).
 * Handles optional :Ns duration suffix.
 */
export function stripAllAnnotations(script: string): string {
  let clean = script;
  // Remove wrapper tags (open with optional duration, and close)
  for (const tag of ALL_WRAPPER_TAGS) {
    const esc = escapeRegex(tag);
    clean = clean.replace(new RegExp(`\\[${esc}${DURATION_PATTERN}\\]`, "gi"), "");
    clean = clean.replace(new RegExp(`\\[\\/${esc}\\]`, "gi"), "");
  }
  // Remove self-closing tags with optional duration
  for (const tag of ALL_SELF_CLOSING_TAGS) {
    const esc = escapeRegex(tag);
    clean = clean.replace(new RegExp(`\\[${esc}${DURATION_PATTERN}\\]`, "gi"), "");
  }
  return clean.replace(/\s{2,}/g, " ").trim();
}

/**
 * Estimate video duration in seconds from a raw script.
 * Based on average speaking rate (~150 words/min = 2.5 words/sec)
 * plus explicit pause/timing annotation durations.
 */
export function estimateDuration(rawScript: string): number {
  const clean = stripAllAnnotations(rawScript);

  // Speech duration: ~2.5 words per second average
  const wordCount = clean.split(/\s+/).filter(Boolean).length;
  const speechSeconds = wordCount / 2.5;

  // Add explicit pause/timing durations from annotations
  let pauseSeconds = 0;
  const pauseTimingTags = REGISTRY.filter(
    (d) => d.type === "self-closing" && (d.category === "pause" || d.category === "timing")
  );
  for (const def of pauseTimingTags) {
    const esc = escapeRegex(def.tag);
    const regex = new RegExp(`\\[${esc}${DURATION_PATTERN}\\]`, "gi");
    let match: RegExpExecArray | null;
    while ((match = regex.exec(rawScript)) !== null) {
      pauseSeconds += match[1] ? parseFloat(match[1]) : (def.defaultDuration ?? 1);
    }
  }

  return Math.max(1, Math.round((speechSeconds + pauseSeconds) * 10) / 10);
}

