import { NextResponse } from "next/server";
import { checkAvatarStatus } from "@/lib/klingAvatar";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ generationId: string }> }
) {
  const { generationId } = await params;

  try {
    const result = await checkAvatarStatus(generationId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        status: "failed",
        error: error instanceof Error ? error.message : "Status check failed",
      },
      { status: 500 }
    );
  }
}
