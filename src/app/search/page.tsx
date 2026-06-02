"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Music, Disc3, Mic2, Loader2, Clock } from "lucide-react";
import Link from "next/link";
import type { SpotifyTrack, SpotifyAlbum, SpotifyArtist } from "@/lib/spotify";

type TabType = "all" | "songs" | "albums" | "artists";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<TabType>("all");
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [albums, setAlbums] = useState<SpotifyAlbum[]>([]);
  const [artists, setArtists] = useState<SpotifyArtist[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = useCallback(async (q: string) => {
    if (q.trim().length === 0) {
      setTracks([]);
      setAlbums([]);
      setArtists([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `/api/spotify/search?q=${encodeURIComponent(q)}`
      );
      const data = await res.json();
      setTracks(data.tracks || []);
      setAlbums(data.albums || []);
      setArtists(data.artists || []);
      setSearched(true);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      search(query);
    }, 400);
    return () => clearTimeout(timer);
  }, [query, search]);

  function formatDuration(ms: number) {
    const min = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    return `${min}:${sec.toString().padStart(2, "0")}`;
  }

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: "all", label: "All", count: tracks.length + albums.length + artists.length },
    { key: "songs", label: "Songs", count: tracks.length },
    { key: "albums", label: "Albums", count: albums.length },
    { key: "artists", label: "Artists", count: artists.length },
  ];

  const showTracks = tab === "all" || tab === "songs";
  const showAlbums = tab === "all" || tab === "albums";
  const showArtists = tab === "all" || tab === "artists";

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Search input */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for songs, albums, or artists..."
          autoFocus
          className="w-full pl-12 pr-4 py-3.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition text-base"
        />
        {loading && (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 animate-spin" />
        )}
      </div>

      {/* Tabs */}
      {searched && (
        <div className="flex gap-1 mb-6 bg-zinc-900/50 p-1 rounded-lg w-fit">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                tab === t.key
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {t.label}
              {searched && (
                <span className="ml-1.5 text-xs text-zinc-500">{t.count}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      {!searched && !loading && (
        <div className="text-center py-20">
          <Music className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
          <p className="text-zinc-400">
            Search for any song, album, or artist to get started
          </p>
        </div>
      )}

      {searched && tracks.length === 0 && albums.length === 0 && artists.length === 0 && (
        <div className="text-center py-20">
          <p className="text-zinc-400">No results found for &ldquo;{query}&rdquo;</p>
        </div>
      )}

      <div className="space-y-8">
        {/* Songs */}
        {showTracks && tracks.length > 0 && (
          <section>
            {tab === "all" && (
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                Songs
              </h2>
            )}
            <div className="space-y-1">
              {tracks.map((track) => (
                <Link
                  key={track.id}
                  href={`/song/${track.id}`}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-zinc-900/80 transition group"
                >
                  {track.album.images[0] ? (
                    <img
                      src={track.album.images[track.album.images.length - 1]?.url}
                      alt={track.album.name}
                      className="w-12 h-12 rounded-md object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-md bg-zinc-800 flex items-center justify-center shrink-0">
                      <Music className="w-5 h-5 text-zinc-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate group-hover:text-green-500 transition">
                      {track.name}
                    </p>
                    <p className="text-zinc-400 text-sm truncate">
                      {track.artists.map((a) => a.name).join(", ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-zinc-500 text-sm shrink-0">
                    <Clock className="w-3.5 h-3.5" />
                    {formatDuration(track.duration_ms)}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Albums */}
        {showAlbums && albums.length > 0 && (
          <section>
            {tab === "all" && (
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                Albums
              </h2>
            )}
            <div className="space-y-1">
              {albums.map((album) => (
                <Link
                  key={album.id}
                  href={`/album/${album.id}`}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-zinc-900/80 transition group"
                >
                  {album.images[0] ? (
                    <img
                      src={album.images[album.images.length - 1]?.url}
                      alt={album.name}
                      className="w-12 h-12 rounded-md object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-md bg-zinc-800 flex items-center justify-center shrink-0">
                      <Disc3 className="w-5 h-5 text-zinc-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate group-hover:text-green-500 transition">
                      {album.name}
                    </p>
                    <p className="text-zinc-400 text-sm truncate">
                      {album.artists.map((a) => a.name).join(", ")} · {album.release_date?.slice(0, 4)}
                    </p>
                  </div>
                  <span className="text-zinc-500 text-xs shrink-0">
                    {album.total_tracks} tracks
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Artists */}
        {showArtists && artists.length > 0 && (
          <section>
            {tab === "all" && (
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                Artists
              </h2>
            )}
            <div className="space-y-1">
              {artists.map((artist) => (
                <div
                  key={artist.id}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-zinc-900/80 transition"
                >
                  {artist.images[0] ? (
                    <img
                      src={artist.images[artist.images.length - 1]?.url}
                      alt={artist.name}
                      className="w-12 h-12 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
                      <Mic2 className="w-5 h-5 text-zinc-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">
                      {artist.name}
                    </p>
                    <p className="text-zinc-400 text-sm truncate">
                      {artist.genres?.slice(0, 3).join(", ") || "Artist"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
