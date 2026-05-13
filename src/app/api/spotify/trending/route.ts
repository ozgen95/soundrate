import { NextResponse } from "next/server";

async function getAccessToken(): Promise<string> {
  const clientId = process.env.SPOTIFY_CLIENT_ID!;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  });

  const data = await response.json();
  return data.access_token;
}

export async function GET() {
  try {
    const token = await getAccessToken();

    // Use search to find popular/recent tracks since browse endpoints were removed
    const tracksRes = await fetch(
      `https://api.spotify.com/v1/search?q=year%3A2026&type=track&limit=10`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const tracksData = await tracksRes.json();

    // Search for recent albums
    const albumsRes = await fetch(
      `https://api.spotify.com/v1/search?q=year%3A2026&type=album&limit=10`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    const albumsData = await albumsRes.json();

    return NextResponse.json({
      topTracks: tracksData.tracks?.items || [],
      newAlbums: albumsData.albums?.items || [],
    });
  } catch (error) {
    console.error("Trending error:", error);
    return NextResponse.json(
      { error: "Failed to fetch trending" },
      { status: 500 },
    );
  }
}
