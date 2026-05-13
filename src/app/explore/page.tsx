"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  Music,
  Disc3,
  Star,
  Loader2,
  TrendingUp,
  Flame,
  Award,
} from "lucide-react";

interface TrendingTrack {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  album: {
    id: string;
    name: string;
    images: { url: string }[];
  };
}

interface NewAlbum {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  images: { url: string }[];
  release_date: string;
  total_tracks: number;
}

interface TopRatedItem {
  spotify_id: string;
  title: string;
  avg_rating: number;
  total_ratings: number;
  cover_url: string | null;
  artist_name: string;
  type: "song" | "album";
}

type TabType = "trending" | "new" | "top";

export default function ExplorePage() {
  const [tab, setTab] = useState<TabType>("trending");
  const [topTracks, setTopTracks] = useState<TrendingTrack[]>([]);
  const [newAlbums, setNewAlbums] = useState<NewAlbum[]>([]);
  const [topRated, setTopRated] = useState<TopRatedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    async function load() {
      // Fetch trending from Spotify
      const res = await fetch("/api/spotify/trending");
      const data = await res.json();
      setTopTracks(data.topTracks || []);
      setNewAlbums(data.newAlbums || []);

      // Fetch top rated from our DB
      await loadTopRated();

      setLoading(false);
    }
    load();
  }, []);

  async function loadTopRated() {
    // Get top rated songs
    const { data: songRatings } = await supabase
      .from("ratings")
      .select("song_id, score")
      .not("song_id", "is", null);

    // Get top rated albums
    const { data: albumRatings } = await supabase
      .from("ratings")
      .select("album_id, score")
      .not("album_id", "is", null);

    // Aggregate song ratings
    const songScores: Record<string, number[]> = {};
    for (const r of songRatings || []) {
      if (!r.song_id) continue;
      if (!songScores[r.song_id]) songScores[r.song_id] = [];
      songScores[r.song_id].push(r.score);
    }

    // Aggregate album ratings
    const albumScores: Record<string, number[]> = {};
    for (const r of albumRatings || []) {
      if (!r.album_id) continue;
      if (!albumScores[r.album_id]) albumScores[r.album_id] = [];
      albumScores[r.album_id].push(r.score);
    }

    const items: TopRatedItem[] = [];

    // Fetch song details
    const songIds = Object.keys(songScores);
    if (songIds.length > 0) {
      const { data: songs } = await supabase
        .from("songs")
        .select(
          "id, spotify_id, title, artist:artists(name), album:albums(cover_url)",
        )
        .in("id", songIds);

      for (const song of songs || []) {
        const scores = songScores[song.id];
        const artist = song.artist as unknown as { name: string };
        const album = song.album as unknown as { cover_url: string | null };
        items.push({
          spotify_id: song.spotify_id,
          title: song.title,
          avg_rating:
            Math.round(
              (scores.reduce((a, b) => a + b, 0) / scores.length) * 10,
            ) / 10,
          total_ratings: scores.length,
          cover_url: album?.cover_url || null,
          artist_name: artist?.name || "Unknown",
          type: "song",
        });
      }
    }

    // Fetch album details
    const albumIds = Object.keys(albumScores);
    if (albumIds.length > 0) {
      const { data: albums } = await supabase
        .from("albums")
        .select("id, spotify_id, title, cover_url, artist:artists(name)")
        .in("id", albumIds);

      for (const album of albums || []) {
        const scores = albumScores[album.id];
        const artist = album.artist as unknown as { name: string };
        items.push({
          spotify_id: album.spotify_id,
          title: album.title,
          avg_rating:
            Math.round(
              (scores.reduce((a, b) => a + b, 0) / scores.length) * 10,
            ) / 10,
          total_ratings: scores.length,
          cover_url: album.cover_url,
          artist_name: artist?.name || "Unknown",
          type: "album",
        });
      }
    }

    // Sort by average rating, then by number of ratings
    items.sort(
      (a, b) =>
        b.avg_rating - a.avg_rating || b.total_ratings - a.total_ratings,
    );
    setTopRated(items);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 text-zinc-500 animate-spin" />
      </div>
    );
  }

  const tabs = [
    { key: "trending" as const, label: "Trending", icon: TrendingUp },
    { key: "new" as const, label: "New Releases", icon: Flame },
    { key: "top" as const, label: "Top Rated", icon: Award },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">Explore</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 bg-zinc-900/50 p-1 rounded-lg w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition flex items-center gap-1.5 ${
              tab === t.key
                ? "bg-zinc-700 text-white"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Trending tracks */}
      {tab === "trending" && (
        <div>
          <p className="text-zinc-500 text-sm mb-4">
            Popular tracks right now on Spotify
          </p>
          <div className="grid sm:grid-cols-2 gap-2">
            {topTracks.map((track, i) => (
              <Link
                key={track.id}
                href={`/song/${track.id}`}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-900/80 transition group"
              >
                <span className="text-zinc-600 text-sm font-medium w-6 text-right shrink-0">
                  {i + 1}
                </span>
                {track.album.images[0] ? (
                  <img
                    src={track.album.images[track.album.images.length - 1]?.url}
                    alt={track.album.name}
                    className="w-11 h-11 rounded-md object-cover shrink-0"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-md bg-zinc-800 flex items-center justify-center shrink-0">
                    <Music className="w-4 h-4 text-zinc-600" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate group-hover:text-amber-400 transition">
                    {track.name}
                  </p>
                  <p className="text-zinc-400 text-xs truncate">
                    {track.artists.map((a) => a.name).join(", ")}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* New releases */}
      {tab === "new" && (
        <div>
          <p className="text-zinc-500 text-sm mb-4">
            Fresh releases from Spotify
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {newAlbums.map((album) => (
              <Link
                key={album.id}
                href={`/album/${album.id}`}
                className="group"
              >
                {album.images[0] ? (
                  <img
                    src={album.images[0].url}
                    alt={album.name}
                    className="w-full aspect-square rounded-lg object-cover mb-2 group-hover:opacity-80 transition"
                  />
                ) : (
                  <div className="w-full aspect-square rounded-lg bg-zinc-800 flex items-center justify-center mb-2">
                    <Disc3 className="w-8 h-8 text-zinc-600" />
                  </div>
                )}
                <p className="text-white text-sm font-medium truncate group-hover:text-amber-400 transition">
                  {album.name}
                </p>
                <p className="text-zinc-400 text-xs truncate">
                  {album.artists.map((a) => a.name).join(", ")}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Top rated on platform */}
      {tab === "top" && (
        <div>
          <p className="text-zinc-500 text-sm mb-4">
            Highest rated by the SoundRate community
          </p>
          {topRated.length === 0 ? (
            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-10 text-center">
              <Star className="w-10 h-10 text-zinc-600 mx-auto mb-4" />
              <p className="text-zinc-300 font-medium mb-1">No ratings yet</p>
              <p className="text-zinc-500 text-sm">
                Be the first to{" "}
                <Link
                  href="/search"
                  className="text-amber-400 hover:text-amber-300"
                >
                  rate some music
                </Link>
                !
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {topRated.map((item, i) => (
                <Link
                  key={`${item.type}-${item.spotify_id}`}
                  href={
                    item.type === "song"
                      ? `/song/${item.spotify_id}`
                      : `/album/${item.spotify_id}`
                  }
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-zinc-900/80 transition group"
                >
                  <span className="text-zinc-600 text-sm font-medium w-6 text-right shrink-0">
                    {i + 1}
                  </span>
                  {item.cover_url ? (
                    <img
                      src={item.cover_url}
                      alt={item.title}
                      className="w-12 h-12 rounded-md object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-md bg-zinc-800 flex items-center justify-center shrink-0">
                      {item.type === "song" ? (
                        <Music className="w-5 h-5 text-zinc-600" />
                      ) : (
                        <Disc3 className="w-5 h-5 text-zinc-600" />
                      )}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate group-hover:text-amber-400 transition">
                      {item.title}
                    </p>
                    <p className="text-zinc-400 text-sm truncate">
                      {item.artist_name}
                      <span className="text-zinc-600 mx-1.5">·</span>
                      <span className="text-zinc-500">
                        {item.type === "song" ? "Song" : "Album"}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span className="text-white font-medium text-sm">
                      {item.avg_rating}
                    </span>
                    <span className="text-zinc-500 text-xs">
                      ({item.total_ratings})
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
