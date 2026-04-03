import { fal } from "@fal-ai/client";
import type { AnimationConfig, AvatarModel } from "@/types";

// Configure fal client
fal.config({ credentials: process.env.FAL_KEY || "edc34a51-7f9f-4726-b931-3d6eca3986ea:79a3307eb88a467aa444213ec04d5632" });

interface AvatarParams {
  imageUrl: string;
  audioUrl: string;
  prompt: string;
  animation: AnimationConfig;
  model?: AvatarModel;
}

/**
 * Generate talking avatar video.
 * Supports multiple models — user picks which one to use.
 */
export async function generateAvatar(params: AvatarParams): Promise<string> {
  const { imageUrl, audioUrl, prompt, model = "aurora" } = params;
  const optimizedPrompt = buildPrompt(prompt);
  const hasInlineCues = prompt.includes("Inline Cues:");

  if (model === "hedra") {
    return generateWithHedra(imageUrl, audioUrl, optimizedPrompt);
  }

  return generateWithAurora(imageUrl, audioUrl, optimizedPrompt, hasInlineCues);
}

// ── Aurora (Creatify) ──
async function generateWithAurora(
  imageUrl: string, audioUrl: string, prompt: string, hasInlineCues: boolean
): Promise<string> {
  const result = await fal.subscribe("fal-ai/creatify/aurora", {
    input: {
      image_url: imageUrl,
      audio_url: audioUrl,
      prompt,
      guidance_scale: hasInlineCues ? 2 : 1,
      audio_guidance_scale: 2,
      resolution: "720p",
    },
  });

  const data = result.data as { video: { url: string } };
  return data.video.url;
}

// ── Hedra ──
async function generateWithHedra(
  imageUrl: string, audioUrl: string, prompt: string
): Promise<string> {
  const result = await fal.subscribe("fal-ai/hedra", {
    input: {
      image_url: imageUrl,
      audio_url: audioUrl,
      prompt,
    },
  });

  const data = result.data as { video: { url: string } };
  return data.video.url;
}

/**
 * Build optimized prompt.
 * Prioritizes: identity → inline cues → body movement → script
 */
function buildPrompt(compiledPrompt: string): string {
  const cuesMatch = compiledPrompt.match(/Inline Cues:\n([\s\S]*?)(?=\n\n|$)/);
  const inlineCues = cuesMatch ? cuesMatch[0] : "";

  const scriptMatch = compiledPrompt.match(/Script:\n"([\s\S]*?)"/);
  const scriptText = scriptMatch ? scriptMatch[1].slice(0, 200) : "";

  const bodyMatch = compiledPrompt.match(/Body Movement:\n([\s\S]*?)(?=\n\n|$)/);
  const bodyText = bodyMatch ? bodyMatch[0].slice(0, 150) : "";

  const toneMatch = compiledPrompt.match(/Tone:\n([\s\S]*?)(?=\n\n|$)/);
  const toneText = toneMatch ? toneMatch[0].slice(0, 80) : "";

  const parts = [
    "9:16 vertical. Black crocodile mascot (ZAG) in full-body suit, white gloves, holding microphone, speaking to camera on green screen.",
    inlineCues,
    bodyText,
    toneText,
    scriptText ? `Speaking: "${scriptText}"` : "",
  ].filter(Boolean);

  return parts.join("\n").slice(0, 900);
}
