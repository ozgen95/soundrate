import { NextRequest, NextResponse } from "next/server";
import { getTrack } from "@/lib/spotify";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const track = await getTrack(id);
    return NextResponse.json(track);
  } catch (error) {
    console.error("Spotify track error:", error);
    return NextResponse.json(
      { error: "Failed to fetch track" },
      { status: 500 },
    );
  }
}
