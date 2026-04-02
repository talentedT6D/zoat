const HIGGSFIELD_API_KEY = process.env.HIGGSFIELD_API_KEY || "30d30b7f-2099-4276-940e-e367bec12ac9:743f29c61d87a0936891621382aebf83974395a198b038b129900a725851db44";
const HIGGSFIELD_API_URL = "https://api.higgsfield.ai/v1/speak/higgsfield";
const HIGGSFIELD_STATUS_URL = "https://api.higgsfield.ai/v1/generations";

/**
 * Submit a talking avatar job to Higgsfield Cloud API
 * Returns the generation ID for polling
 */
export async function submitAvatar(imageUrl: string, audioUrl: string): Promise<string> {
  const submitRes = await fetch(HIGGSFIELD_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Key ${HIGGSFIELD_API_KEY}`,
    },
    body: JSON.stringify({
      task: "talking-avatar",
      input_image: imageUrl,
      input_audio: audioUrl,
      quality: "standard",
    }),
  });

  if (!submitRes.ok) {
    const errText = await submitRes.text();
    throw new Error(`Higgsfield API error (${submitRes.status}): ${errText}`);
  }

  const submitData = await submitRes.json();
  const generationId = submitData.generation_id || submitData.request_id || submitData.id;

  if (!generationId) {
    throw new Error(`Higgsfield API error: no generation ID returned. Response: ${JSON.stringify(submitData)}`);
  }

  return generationId;
}

/**
 * Check status of a Higgsfield generation
 * Returns { status, videoUrl } — videoUrl is set when completed
 */
export async function checkAvatarStatus(generationId: string): Promise<{
  status: "processing" | "done" | "failed";
  videoUrl?: string;
  error?: string;
}> {
  const res = await fetch(`${HIGGSFIELD_STATUS_URL}/${generationId}`, {
    headers: {
      "Authorization": `Key ${HIGGSFIELD_API_KEY}`,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Higgsfield status check error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const status = data.status;

  if (status === "completed") {
    const videoUrl = data.output_url || data.media_urls?.[0];
    return { status: "done", videoUrl };
  }

  if (status === "failed" || status === "nsfw" || status === "cancelled") {
    return { status: "failed", error: data.error || `Generation ${status}` };
  }

  // queued / in_progress
  return { status: "processing" };
}
