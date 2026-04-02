import {
  REGISTRY,
  ALL_WRAPPER_TAGS,
  ALL_SELF_CLOSING_TAGS,
  escapeRegex,
  type AnnotationDef,
  type AnnotationCategory,
} from "./annotationRegistry";

export interface ParsedCue {
  def: AnnotationDef;
  position?: "early" | "midway" | "late";
  text?: string; // for wrapper tags
}

export interface ParsedScript {
  ttsText: string;
  gestureDirections: string;
  toneDirections: string;
  cleanScript: string;
  cuesByCategory: Partial<Record<AnnotationCategory, ParsedCue[]>>;
}

/**
 * Parse inline annotations from a raw script.
 * Data-driven from the annotation registry — supports any registered tag.
 */
export function parseAnnotations(rawScript: string): ParsedScript {
  let ttsText = rawScript;
  const cues: ParsedCue[] = [];

  // 1. Process wrapper tags first (e.g. [loud]text[/loud])
  const wrappers = REGISTRY.filter((d) => d.type === "wrapper");
  for (const def of wrappers) {
    const esc = escapeRegex(def.tag);
    const regex = new RegExp(`\\[${esc}\\](.*?)\\[\\/${esc}\\]`, "gi");
    ttsText = ttsText.replace(regex, (_match, content: string) => {
      cues.push({ def, text: content.trim() });
      switch (def.ttsEffect) {
        case "uppercase":
          return content.toUpperCase();
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
    const regex = new RegExp(`\\[${esc}\\]`, "gi");

    // Collect position-aware cues before stripping
    if (def.positionAware) {
      let match: RegExpExecArray | null;
      const findRegex = new RegExp(`\\[${esc}\\]`, "gi");
      while ((match = findRegex.exec(ttsText)) !== null) {
        const rel = ttsText.length > 0 ? match.index / ttsText.length : 0;
        const position = rel < 0.33 ? "early" : rel < 0.66 ? "midway" : "late";
        cues.push({ def, position });
      }
    } else {
      // Non-position-aware self-closing (pauses, timing)
      const findRegex = new RegExp(`\\[${esc}\\]`, "gi");
      while (findRegex.exec(ttsText) !== null) {
        cues.push({ def });
      }
    }

    // Apply TTS effect then strip
    switch (def.ttsEffect) {
      case "ellipsis":
        ttsText = ttsText.replace(regex, "...");
        break;
      case "long-ellipsis":
        ttsText = ttsText.replace(regex, ". ...");
        break;
      default:
        // "none" — just strip
        ttsText = ttsText.replace(regex, "");
        break;
    }
  }

  // 3. Clean up whitespace
  ttsText = ttsText.replace(/\s{2,}/g, " ").trim();

  // 4. Group cues by category
  const cuesByCategory: Partial<Record<AnnotationCategory, ParsedCue[]>> = {};
  for (const cue of cues) {
    const cat = cue.def.category;
    (cuesByCategory[cat] ??= []).push(cue);
  }

  // 5. Build legacy direction strings (backward compat)
  const gestureDirections = buildCategoryDirections(cuesByCategory["gesture"]);
  const toneDirections = buildWrapperDirections(cuesByCategory["voice"]);

  // 6. Clean script for display/char counting
  const cleanScript = stripAllAnnotations(rawScript);

  return { ttsText, gestureDirections, toneDirections, cleanScript, cuesByCategory };
}

function buildCategoryDirections(cues?: ParsedCue[]): string {
  if (!cues || cues.length === 0) return "";
  const parts = cues.map(
    (c) => `${c.def.promptEffect}${c.position ? ` ${c.position} in speech` : ""}`
  );
  return `Gestures: ${parts.join(", ")}.`;
}

function buildWrapperDirections(cues?: ParsedCue[]): string {
  if (!cues || cues.length === 0) return "";
  const parts = cues.map(
    (c) => `${c.def.promptEffect} for "${(c.text ?? "").slice(0, 30)}"`
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
    gesture: "Gestures",
    emotion: "Emotion",
    expression: "Expression",
    camera: "Camera",
    effect: "Effects",
  };

  const lines: string[] = [];

  for (const [cat, label] of Object.entries(CATEGORY_LABELS) as [AnnotationCategory, string][]) {
    const cues = cuesByCategory[cat];
    if (!cues || cues.length === 0) continue;

    let line: string;
    if (cat === "voice") {
      // Wrapper tags: show what text they wrap
      const parts = cues.map(
        (c) => `${c.def.promptEffect} for "${(c.text ?? "").slice(0, 30)}"`
      );
      line = `${label}: ${parts.join("; ")}`;
    } else {
      // Self-closing tags: show position if available
      const parts = cues.map(
        (c) => `${c.def.promptEffect}${c.position ? ` ${c.position} in speech` : ""}`
      );
      line = `${label}: ${parts.join(", ")}`;
    }

    lines.push(`  - ${line.slice(0, 200)}`);
  }

  return lines.length > 0 ? `Inline Cues:\n${lines.join("\n")}` : "";
}

/**
 * Strip all annotation tags from script (for display/char counting)
 */
export function stripAllAnnotations(script: string): string {
  let clean = script;
  // Remove wrapper tags (open and close)
  for (const tag of ALL_WRAPPER_TAGS) {
    const esc = escapeRegex(tag);
    clean = clean.replace(new RegExp(`\\[\\/?${esc}\\]`, "gi"), "");
  }
  // Remove self-closing tags
  for (const tag of ALL_SELF_CLOSING_TAGS) {
    const esc = escapeRegex(tag);
    clean = clean.replace(new RegExp(`\\[${esc}\\]`, "gi"), "");
  }
  return clean.replace(/\s{2,}/g, " ").trim();
}
