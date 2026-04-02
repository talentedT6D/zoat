const HIGGSFIELD_API_KEY = "30d30b7f-2099-4276-940e-e367bec12ac9";
const HIGGSFIELD_SECRET = "743f29c61d87a0936891621382aebf83974395a198b038b129900a725851db44";
const HIGGSFIELD_BASE = "https://platform.higgsfield.ai";

/**
 * Submit a talking avatar job to Higgsfield Cloud API
 * Returns the generation ID for polling
 */
export async function submitAvatar(imageUrl: string, audioUrl: string): Promise<string> {
  const submitRes = await fetch(`${HIGGSFIELD_BASE}/v1/speak`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "hf-api-key": HIGGSFIELD_API_KEY,
      "hf-secret": HIGGSFIELD_SECRET,
    },
    body: JSON.stringify({
      params: {
        input_image: imageUrl,
        input_audio: audioUrl,
      },
    }),
  });

  if (!submitRes.ok) {
    const errText = await submitRes.text();
    throw new Error(`Higgsfield API error (${submitRes.status}): ${errText.slice(0, 200)}`);
  }

  const submitData = await submitRes.json();
  const requestId = submitData.request_id || submitData.generation_id || submitData.id;

  if (!requestId) {
    throw new Error(`Higgsfield: no request ID returned. Response: ${JSON.stringify(submitData).slice(0, 200)}`);
  }

  return requestId;
}

/**
 * Check status of a Higgsfield generation
 */
export async function checkAvatarStatus(requestId: string): Promise<{
  status: "processing" | "done" | "failed";
  videoUrl?: string;
  error?: string;
}> {
  const res = await fetch(`${HIGGSFIELD_BASE}/requests/${requestId}/status`, {
    headers: {
      "hf-api-key": HIGGSFIELD_API_KEY,
      "hf-secret": HIGGSFIELD_SECRET,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Higgsfield status error (${res.status}): ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const status = data.status;

  if (status === "completed") {
    const videoUrl = data.output_url || data.media_urls?.[0] || data.result?.url;
    return { status: "done", videoUrl };
  }

  if (status === "failed" || status === "nsfw" || status === "cancelled") {
    return { status: "failed", error: data.error || `Generation ${status}` };
  }

  return { status: "processing" };
}
