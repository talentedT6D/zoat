import { NextResponse } from "next/server";
import { checkAvatarStatus } from "@/lib/klingAvatar";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  try {
    const result = await checkAvatarStatus(jobId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Status check error:", error);
    return NextResponse.json(
      { status: "failed", error: "Failed to check job status" },
      { status: 500 }
    );
  }
}
