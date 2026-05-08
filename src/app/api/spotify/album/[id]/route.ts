import { NextRequest, NextResponse } from "next/server";
import { getAlbum } from "@/lib/spotify";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const album = await getAlbum(id);
    return NextResponse.json(album);
  } catch (error) {
    console.error("Spotify album error:", error);
    return NextResponse.json(
      { error: "Failed to fetch album" },
      { status: 500 },
    );
  }
}
