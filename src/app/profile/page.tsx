"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Star, Users, Music, Disc3 } from "lucide-react";

interface RatingItem {
  id: string;
  score: number;
  created_at: string;
  song: {
    spotify_id: string;
    title: string;
    artist: { name: string };
    album: { cover_url: string | null } | null;
  } | null;
  album: {
    spotify_id: string;
    title: string;
    cover_url: string | null;
    artist: { name: string };
  } | null;
  reviews: { body: string }[];
}

type TabType = "all" | "songs" | "albums";

export default function ProfilePage() {
  const [profile, setProfile] = useState<{
    id: string;
    username: string;
    display_name: string | null;
    bio: string | null;
  } | null>(null);
  const [ratings, setRatings] = useState<RatingItem[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [tab, setTab] = useState<TabType>("all");
  const [loading, setLoading] = useState(true);

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login");
        return;
      }

      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, username, display_name, bio")
        .eq("id", user.id)
        .single();

      setProfile(profileData);

      // Fetch all ratings with song/album details
      const { data: ratingsData } = await supabase
        .from("ratings")
        .select(
          `id, score, created_at,
          song:songs(spotify_id, title, artist:artists(name), album:albums(cover_url)),
          album:albums(spotify_id, title, cover_url, artist:artists(name)),
          reviews(body)`,
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setRatings((ratingsData as unknown as RatingItem[]) || []);

      // Counts
      const { count: fc } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", user.id);
      setFollowersCount(fc || 0);

      const { count: fgc } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", user.id);
      setFollowingCount(fgc || 0);

      setLoading(false);
    }
    load();
  }, [supabase, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-zinc-700 border-t-amber-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) return null;

  const songRatings = ratings.filter((r) => r.song !== null);
  const albumRatings = ratings.filter((r) => r.album !== null);
  const filtered =
    tab === "songs" ? songRatings : tab === "albums" ? albumRatings : ratings;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      {/* Profile header */}
      <div className="flex items-start gap-6 mb-10">
        <div className="w-20 h-20 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-2xl font-bold text-amber-400 shrink-0">
          {profile.display_name?.[0]?.toUpperCase() ||
            profile.username?.[0]?.toUpperCase() ||
            "?"}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">
            {profile.display_name || profile.username}
          </h1>
          <p className="text-zinc-400 text-sm">@{profile.username}</p>
          {profile.bio && (
            <p className="text-zinc-300 mt-2 text-sm">{profile.bio}</p>
          )}

          <div className="flex gap-6 mt-4">
            <div className="flex items-center gap-1.5 text-sm">
              <Star className="w-4 h-4 text-amber-400" />
              <span className="text-white font-medium">{ratings.length}</span>
              <span className="text-zinc-500">ratings</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <Users className="w-4 h-4 text-zinc-400" />
              <span className="text-white font-medium">{followersCount}</span>
              <span className="text-zinc-500">followers</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <span className="text-white font-medium">{followingCount}</span>
              <span className="text-zinc-500">following</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-t border-zinc-800 pt-6">
        <div className="flex gap-1 mb-6 bg-zinc-900/50 p-1 rounded-lg w-fit">
          {(
            [
              { key: "all", label: "All", count: ratings.length },
              { key: "songs", label: "Songs", count: songRatings.length },
              { key: "albums", label: "Albums", count: albumRatings.length },
            ] as const
          ).map((t) => (
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
              <span className="ml-1.5 text-xs text-zinc-500">{t.count}</span>
            </button>
          ))}
        </div>

        {/* Ratings list */}
        {filtered.length === 0 ? (
          <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-8 text-center">
            <Music className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-400 text-sm">
              No ratings yet.{" "}
              <Link
                href="/search"
                className="text-amber-400 hover:text-amber-300"
              >
                Start exploring music!
              </Link>
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((rating) => {
              const isSong = rating.song !== null;
              const title = isSong ? rating.song!.title : rating.album!.title;
              const artistName = isSong
                ? rating.song!.artist?.name
                : rating.album!.artist?.name;
              const coverUrl = isSong
                ? rating.song!.album?.cover_url
                : rating.album!.cover_url;
              const href = isSong
                ? `/song/${rating.song!.spotify_id}`
                : `/album/${rating.album!.spotify_id}`;
              const reviewBody =
                rating.reviews && rating.reviews.length > 0
                  ? rating.reviews[0].body
                  : null;

              return (
                <Link
                  key={rating.id}
                  href={href}
                  className="flex gap-4 p-4 rounded-xl hover:bg-zinc-900/80 transition group"
                >
                  {coverUrl ? (
                    <img
                      src={coverUrl}
                      alt={title}
                      className="w-14 h-14 rounded-lg object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                      {isSong ? (
                        <Music className="w-5 h-5 text-zinc-600" />
                      ) : (
                        <Disc3 className="w-5 h-5 text-zinc-600" />
                      )}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-white font-medium truncate group-hover:text-amber-400 transition">
                          {title}
                        </p>
                        <p className="text-zinc-400 text-sm truncate">
                          {artistName}
                          <span className="text-zinc-600 mx-1.5">·</span>
                          <span className="text-zinc-500">
                            {isSong ? "Song" : "Album"}
                          </span>
                        </p>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${
                              s <= rating.score
                                ? "text-amber-400 fill-amber-400"
                                : "text-zinc-700"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    {reviewBody && (
                      <p className="text-zinc-400 text-sm mt-1.5 line-clamp-2">
                        {reviewBody}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
