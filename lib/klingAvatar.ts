import { fal } from "@fal-ai/client";
import type { AnimationConfig, AvatarModel } from "@/types";

fal.config({ credentials: process.env.FAL_KEY || "edc34a51-7f9f-4726-b931-3d6eca3986ea:79a3307eb88a467aa444213ec04d5632" });

interface AvatarParams {
  imageUrl: string;
  audioUrl: string;
  prompt: string;
  animation: AnimationConfig;
  model?: AvatarModel;
}

export async function generateAvatar(params: AvatarParams): Promise<string> {
  const { imageUrl, audioUrl, prompt, model = "aurora" } = params;
  const optimizedPrompt = buildPrompt(prompt);

  switch (model) {
    case "hedra":
      return callFal("fal-ai/hedra", {
        image_url: imageUrl, audio_url: audioUrl, prompt: optimizedPrompt,
      });

    case "ai-avatar":
      return callFal("fal-ai/ai-avatar", {
        image_url: imageUrl, audio_url: audioUrl, prompt: optimizedPrompt,
        num_frames: 145, resolution: "720p",
      });

    case "kling":
      return callFal("fal-ai/kling-video/v1/pro/ai-avatar", {
        image_url: imageUrl, audio_url: audioUrl, prompt: optimizedPrompt,
      });

    case "hunyuan":
      return callFal("fal-ai/hunyuan-avatar", {
        image_url: imageUrl, audio_url: audioUrl, text: optimizedPrompt,
        num_inference_steps: 30,
      });

    case "echomimic":
      return callFal("fal-ai/echomimic-v3", {
        image_url: imageUrl, audio_url: audioUrl, prompt: optimizedPrompt,
        guidance_scale: 4.5, audio_guidance_scale: 2.5,
      });

    case "omnihuman":
      return callFal("fal-ai/bytedance/omnihuman/v1.5", {
        image_url: imageUrl, audio_url: audioUrl, prompt: optimizedPrompt,
        turbo_mode: true,
      });

    case "wan-speech":
      return callFal("fal-ai/wan/v2.2-14b/speech-to-video", {
        image_url: imageUrl, audio_url: audioUrl, prompt: optimizedPrompt,
        resolution: "720p", guidance_scale: 3.5, num_inference_steps: 27,
      });

    case "infinitalk":
      return callFal("fal-ai/infinitalk", {
        image_url: imageUrl, audio_url: audioUrl, prompt: optimizedPrompt,
        num_frames: 145, resolution: "720p",
      });

    case "aurora":
    default:
      return callFal("fal-ai/creatify/aurora", {
        image_url: imageUrl, audio_url: audioUrl, prompt: optimizedPrompt,
        guidance_scale: prompt.includes("Inline Cues:") ? 2 : 1,
        audio_guidance_scale: 2, resolution: "720p",
      });
  }
}

async function callFal(endpoint: string, input: Record<string, unknown>): Promise<string> {
  try {
    const result = await fal.subscribe(endpoint as Parameters<typeof fal.subscribe>[0], {
      input,
      pollInterval: 3000,
      timeout: 600_000, // 10 minute timeout
    });
    const data = result.data as Record<string, unknown>;

    const video = data.video as { url?: string } | undefined;
    if (video?.url) return video.url;
    if (typeof data.video === "string") return data.video as string;
    const output = data.output as { url?: string } | undefined;
    if (output?.url) return output.url;

    throw new Error(`No video URL in response from ${endpoint}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`${endpoint.split("/").pop()} failed: ${msg}`);
  }
}

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
    inlineCues, bodyText, toneText,
    scriptText ? `Speaking: "${scriptText}"` : "",
  ].filter(Boolean);

  return parts.join("\n").slice(0, 900);
}
