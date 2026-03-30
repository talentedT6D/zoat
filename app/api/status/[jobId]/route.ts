import { NextResponse } from "next/server";
import { getJob } from "@/lib/jobStore";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const job = getJob(jobId);

  if (!job) {
    return NextResponse.json(
      { status: "failed", error: "Job not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    status: job.status,
    videoUrl: job.videoUrl,
    error: job.error,
  });
}
