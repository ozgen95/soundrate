// ============================================
// Spotify API Client (Server-side only)
// Uses Client Credentials flow for search/metadata
// ============================================

interface SpotifyToken {
  access_token: string;
  expires_at: number;
}

let cachedToken: SpotifyToken | null = null;

async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < cachedToken.expires_at - 60000) {
    return cachedToken.access_token;
  }

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

  if (!response.ok) {
    throw new Error(`Spotify auth failed: ${response.statusText}`);
  }

  const data = await response.json();

  cachedToken = {
    access_token: data.access_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };

  return cachedToken.access_token;
}

async function spotifyFetch(endpoint: string) {
  const token = await getAccessToken();
  const response = await fetch(`https://api.spotify.com/v1${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(
      `Spotify API error: ${response.status} ${response.statusText}`,
    );
  }

  return response.json();
}

// ============================================
// Search
// ============================================

export interface SpotifyTrack {
  id: string;
  name: string;
  track_number: number;
  duration_ms: number;
  preview_url: string | null;
  album: {
    id: string;
    name: string;
    images: { url: string; width: number; height: number }[];
    release_date: string;
    total_tracks: number;
  };
  artists: {
    id: string;
    name: string;
  }[];
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  images: { url: string; width: number; height: number }[];
  release_date: string;
  total_tracks: number;
  album_type: string;
  artists: {
    id: string;
    name: string;
  }[];
}

export interface SpotifyArtist {
  id: string;
  name: string;
  images: { url: string; width: number; height: number }[];
  genres: string[];
}

export interface SearchResults {
  tracks: SpotifyTrack[];
  albums: SpotifyAlbum[];
  artists: SpotifyArtist[];
}

export async function searchSpotify(
  query: string,
  types: string[] = ["track", "album", "artist"],
  limit: number = 10,
): Promise<SearchResults> {
  const typeParam = types.join(",");
  const data = await spotifyFetch(
    `/search?q=${encodeURIComponent(query)}&type=${typeParam}&limit=${limit}`,
  );

  return {
    tracks: data.tracks?.items || [],
    albums: data.albums?.items || [],
    artists: data.artists?.items || [],
  };
}

// ============================================
// Get details
// ============================================

export async function getTrack(trackId: string): Promise<SpotifyTrack> {
  return spotifyFetch(`/tracks/${trackId}`);
}

export async function getAlbum(
  albumId: string,
): Promise<SpotifyAlbum & { tracks: { items: SpotifyTrack[] } }> {
  return spotifyFetch(`/albums/${albumId}`);
}

export async function getArtist(artistId: string): Promise<SpotifyArtist> {
  return spotifyFetch(`/artists/${artistId}`);
}

export async function getAlbumTracks(albumId: string): Promise<SpotifyTrack[]> {
  const data = await spotifyFetch(`/albums/${albumId}/tracks?limit=50`);
  return data.items;
}

// ============================================
// Helpers
// ============================================

export function getImageUrl(
  images: { url: string; width: number; height: number }[],
  size: "small" | "medium" | "large" = "medium",
): string | null {
  if (!images || images.length === 0) return null;

  // Spotify returns images largest first
  switch (size) {
    case "large":
      return images[0]?.url || null;
    case "small":
      return images[images.length - 1]?.url || null;
    case "medium":
    default:
      return images[Math.min(1, images.length - 1)]?.url || null;
  }
}

export function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
