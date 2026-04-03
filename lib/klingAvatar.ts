import { fal } from "@fal-ai/client";
import type { AnimationConfig } from "@/types";

// Configure fal client
fal.config({ credentials: process.env.FAL_KEY || "edc34a51-7f9f-4726-b931-3d6eca3986ea:79a3307eb88a467aa444213ec04d5632" });

interface AvatarParams {
  imageUrl: string;
  audioUrl: string;
  prompt: string;
  animation: AnimationConfig;
}

/**
 * Generate talking avatar video using fal.ai Creatify Aurora
 * Takes ZAG base image + audio → returns MP4 video URL
 */
export async function generateAvatar(params: AvatarParams): Promise<string> {
  const { imageUrl, audioUrl, prompt } = params;

  // Scale guidance based on how much direction is in the prompt
  // More annotations/movement → higher guidance to follow the prompt
  const hasInlineCues = prompt.includes("Inline Cues:");
  const guidanceScale = hasInlineCues ? 2 : prompt.length > 800 ? 1.5 : 1;

  const result = await fal.subscribe("fal-ai/creatify/aurora", {
    input: {
      image_url: imageUrl,
      audio_url: audioUrl,
      prompt: buildAuroraPrompt(prompt),
      guidance_scale: guidanceScale,
      audio_guidance_scale: 2,
      resolution: "720p",
    },
  });

  const data = result.data as { video: { url: string } };
  return data.video.url;
}

/**
 * Condense the full compiled prompt into Aurora-optimized guidance.
 * Prioritizes inline cues (annotations) over static costume/mouth rules
 * since Aurora has limited prompt budget.
 */
function buildAuroraPrompt(compiledPrompt: string): string {
  // Extract the Inline Cues block if present — this is the most actionable part
  const cuesMatch = compiledPrompt.match(/Inline Cues:\n([\s\S]*?)(?=\n\n|$)/);
  const inlineCues = cuesMatch ? cuesMatch[0] : "";

  // Extract the Script block
  const scriptMatch = compiledPrompt.match(/Script:\n"([\s\S]*?)"/);
  const scriptText = scriptMatch ? scriptMatch[1].slice(0, 200) : "";

  // Extract Body Movement block (Aurora can actually respond to movement descriptions)
  const bodyMatch = compiledPrompt.match(/Body Movement:\n([\s\S]*?)(?=\n\n|$)/);
  const bodyText = bodyMatch ? bodyMatch[0].slice(0, 150) : "";

  // Build optimized prompt: character identity + cues + body + script
  const parts = [
    "9:16 vertical framing. Black crocodile mascot character (ZAG) speaking directly to camera on green screen.",
    inlineCues,
    bodyText,
    scriptText ? `Speaking: "${scriptText}"` : "",
  ].filter(Boolean);

  return parts.join("\n").slice(0, 900);
}
