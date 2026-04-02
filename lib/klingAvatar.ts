const HIGGSFIELD_KEY = "30d30b7f-2099-4276-940e-e367bec12ac9:743f29c61d87a0936891621382aebf83974395a198b038b129900a725851db44";
const HIGGSFIELD_BASE = "https://platform.higgsfield.ai";

/**
 * Submit a talking avatar job to Higgsfield Cloud API
 * Endpoint: /v1/speak/higgsfield (from official SDK)
 * Returns the request ID for polling
 */
export async function submitAvatar(imageUrl: string, audioUrl: string, prompt?: string): Promise<string> {
  const submitRes = await fetch(`${HIGGSFIELD_BASE}/v1/speak/higgsfield`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Key ${HIGGSFIELD_KEY}`,
    },
    body: JSON.stringify({
      params: {
        input_image: { type: "image_url", image_url: imageUrl },
        input_audio: { type: "audio_url", audio_url: audioUrl },
        prompt: prompt || "Natural speaking presentation, direct to camera",
        quality: "mid",
      },
    }),
  });

  if (!submitRes.ok) {
    const errText = await submitRes.text();
    throw new Error(`Higgsfield API error (${submitRes.status}): ${errText.slice(0, 300)}`);
  }

  const submitData = await submitRes.json();
  const requestId = submitData.id || submitData.request_id;

  if (!requestId) {
    throw new Error(`Higgsfield: no request_id returned. Response: ${JSON.stringify(submitData).slice(0, 300)}`);
  }

  return requestId;
}

/**
 * Check status of a Higgsfield generation
 * Endpoint: /requests/{request_id}/status
 */
export async function checkAvatarStatus(requestId: string): Promise<{
  status: "processing" | "done" | "failed";
  videoUrl?: string;
  error?: string;
}> {
  const res = await fetch(`${HIGGSFIELD_BASE}/requests/${requestId}/status`, {
    headers: {
      "Authorization": `Key ${HIGGSFIELD_KEY}`,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Higgsfield status error (${res.status}): ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  const status = data.status;

  if (status === "completed") {
    const videoUrl = data.video?.url || data.output_url || data.media_urls?.[0];
    return { status: "done", videoUrl };
  }

  if (status === "failed" || status === "nsfw" || status === "canceled") {
    return { status: "failed", error: data.error || `Generation ${status}` };
  }

  // queued / in_progress
  return { status: "processing" };
}
