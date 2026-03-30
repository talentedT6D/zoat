import { writeFile, mkdir } from "fs/promises";
import path from "path";

/**
 * Storage abstraction.
 * For MVP: writes to local /public/output directory and returns a public URL.
 * Replace with S3/Cloudinary/Supabase for production.
 */

const OUTPUT_DIR = path.join(process.cwd(), "public", "output");

async function ensureDir() {
  await mkdir(OUTPUT_DIR, { recursive: true });
}

export async function uploadAudio(
  buffer: Buffer,
  jobId: string
): Promise<string> {
  await ensureDir();
  const filename = `zag_${jobId}_voice.mp3`;
  const filePath = path.join(OUTPUT_DIR, filename);
  await writeFile(filePath, buffer);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  return `${baseUrl}/output/${filename}`;
}

export async function uploadVideo(
  buffer: Buffer,
  jobId: string,
  type: "avatar" | "broll" = "avatar"
): Promise<string> {
  await ensureDir();
  const filename = `zag_${jobId}_${type}.mp4`;
  const filePath = path.join(OUTPUT_DIR, filename);
  await writeFile(filePath, buffer);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  return `${baseUrl}/output/${filename}`;
}
