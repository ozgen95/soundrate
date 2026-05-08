import { NextRequest, NextResponse } from "next/server";
import { searchSpotify } from "@/lib/spotify";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");
  const type = searchParams.get("type"); // "track", "album", "artist", or comma-separated

  if (!query || query.trim().length === 0) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  try {
    const types = type ? type.split(",") : ["track", "album", "artist"];
    const results = await searchSpotify(query, types, 10);
    return NextResponse.json(results);
  } catch (error) {
    console.error("Spotify search error:", error);
    return NextResponse.json(
      { error: "Failed to search Spotify" },
      { status: 500 },
    );
  }
}
