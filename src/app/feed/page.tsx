"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Star, Music, Disc3, Loader2, Users } from "lucide-react";

interface FeedItem {
  id: string;
  score: number;
  created_at: string;
  user_id: string;
  profile: { username: string; display_name: string | null };
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

export default function FeedPage() {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

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

      setUserId(user.id);

      // Get who the user follows
      const { data: following } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);

      if (!following || following.length === 0) {
        setLoading(false);
        return;
      }

      const followingIds = following.map((f) => f.following_id);

      // Get recent ratings from followed users
      const { data: ratings } = await supabase
        .from("ratings")
        .select(
          `id, score, created_at, user_id,
          profile:profiles!user_id(username, display_name),
          song:songs(spotify_id, title, artist:artists(name), album:albums(cover_url)),
          album:albums(spotify_id, title, cover_url, artist:artists(name)),
          reviews(body)`,
        )
        .in("user_id", followingIds)
        .order("created_at", { ascending: false })
        .limit(50);

      setFeedItems((ratings as unknown as FeedItem[]) || []);
      setLoading(false);
    }
    load();
  }, [supabase, router]);

  function getTimeAgo(dateString: string): string {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return `${Math.floor(days / 30)}mo ago`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 text-zinc-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">Activity Feed</h1>

      {feedItems.length === 0 ? (
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-10 text-center">
          <Users className="w-10 h-10 text-zinc-600 mx-auto mb-4" />
          <p className="text-zinc-300 font-medium mb-1">No activity yet</p>
          <p className="text-zinc-500 text-sm">
            Follow other users to see their ratings here.{" "}
            <Link
              href="/search"
              className="text-amber-400 hover:text-amber-300"
            >
              Discover music
            </Link>{" "}
            and find people to follow.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {feedItems.map((item) => {
            const isSong = item.song !== null;
            const title = isSong ? item.song!.title : item.album!.title;
            const artistName = isSong
              ? item.song!.artist?.name
              : item.album!.artist?.name;
            const coverUrl = isSong
              ? item.song!.album?.cover_url
              : item.album!.cover_url;
            const href = isSong
              ? `/song/${item.song!.spotify_id}`
              : `/album/${item.album!.spotify_id}`;
            const profile = item.profile;
            const reviewData = item.reviews as unknown as
              | { body: string }
              | { body: string }[]
              | null;
            const reviewBody = Array.isArray(reviewData)
              ? reviewData[0]?.body || null
              : reviewData?.body || null;

            return (
              <div
                key={item.id}
                className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-5"
              >
                {/* User info */}
                <div className="flex items-center gap-2 mb-3">
                  <Link
                    href={`/user/${profile?.username}`}
                    className="flex items-center gap-2 group"
                  >
                    <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-amber-400">
                      {(profile?.display_name ||
                        profile?.username)?.[0]?.toUpperCase() || "?"}
                    </div>
                    <span className="text-white text-sm font-medium group-hover:text-amber-400 transition">
                      {profile?.display_name || profile?.username}
                    </span>
                  </Link>
                  <span className="text-zinc-600 text-sm">
                    rated a {isSong ? "song" : "album"}
                  </span>
                  <span className="text-zinc-600 text-xs ml-auto">
                    {getTimeAgo(item.created_at)}
                  </span>
                </div>

                {/* Rated item */}
                <Link
                  href={href}
                  className="flex gap-4 p-3 -mx-1 rounded-lg hover:bg-zinc-800/50 transition group"
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
                    <p className="text-white font-medium truncate group-hover:text-amber-400 transition">
                      {title}
                    </p>
                    <p className="text-zinc-400 text-sm truncate">
                      {artistName}
                    </p>
                    <div className="flex items-center gap-0.5 mt-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${
                            s <= item.score
                              ? "text-amber-400 fill-amber-400"
                              : "text-zinc-700"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </Link>

                {/* Review text */}
                {reviewBody && (
                  <p className="text-zinc-300 text-sm mt-3 leading-relaxed">
                    {reviewBody}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
