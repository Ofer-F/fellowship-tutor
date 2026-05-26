import { NextResponse } from "next/server";
import { readProgress } from "@/lib/progress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get("courseId");
  if (!courseId) {
    return NextResponse.json(
      { error: "Missing courseId" },
      { status: 400 }
    );
  }
  const progress = await readProgress(courseId);
  return NextResponse.json(progress, {
    headers: { "Cache-Control": "no-store" },
  });
}
