"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  Star,
  Users,
  Music,
  Disc3,
  Loader2,
  UserPlus,
  UserMinus,
} from "lucide-react";

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

export default function UserProfilePage() {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<{
    id: string;
    username: string;
    display_name: string | null;
    bio: string | null;
  } | null>(null);
  const [ratings, setRatings] = useState<RatingItem[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [tab, setTab] = useState<TabType>("all");
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);

  const supabase = createClient();

  const loadFollowState = useCallback(
    async (profileId: string, userId: string | null) => {
      const { count: fc } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", profileId);
      setFollowersCount(fc || 0);

      const { count: fgc } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", profileId);
      setFollowingCount(fgc || 0);

      if (userId) {
        const { data: followData } = await supabase
          .from("follows")
          .select("id")
          .eq("follower_id", userId)
          .eq("following_id", profileId)
          .single();
        setIsFollowing(!!followData);
      }
    },
    [supabase],
  );

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, username, display_name, bio")
        .eq("username", username)
        .single();

      if (!profileData) {
        setLoading(false);
        return;
      }

      setProfile(profileData);

      const { data: ratingsData } = await supabase
        .from("ratings")
        .select(
          `id, score, created_at,
          song:songs(spotify_id, title, artist:artists(name), album:albums(cover_url)),
          album:albums(spotify_id, title, cover_url, artist:artists(name)),
          reviews(body)`,
        )
        .eq("user_id", profileData.id)
        .order("created_at", { ascending: false });

      setRatings((ratingsData as unknown as RatingItem[]) || []);
      await loadFollowState(profileData.id, user?.id || null);
      setLoading(false);
    }
    load();
  }, [username, supabase, loadFollowState]);

  async function handleFollow() {
    if (!currentUserId || !profile) return;
    setFollowLoading(true);

    if (isFollowing) {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", currentUserId)
        .eq("following_id", profile.id);
      setIsFollowing(false);
      setFollowersCount((c) => c - 1);
    } else {
      await supabase
        .from("follows")
        .insert({ follower_id: currentUserId, following_id: profile.id });
      setIsFollowing(true);
      setFollowersCount((c) => c + 1);
    }

    setFollowLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 text-zinc-500 animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-32 text-zinc-400">User not found</div>
    );
  }

  const isOwnProfile = currentUserId === profile.id;
  const songRatings = ratings.filter((r) => r.song !== null);
  const albumRatings = ratings.filter((r) => r.album !== null);
  const filtered =
    tab === "songs" ? songRatings : tab === "albums" ? albumRatings : ratings;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      {/* Profile header */}
      <div className="flex items-start gap-6 mb-10">
        <div className="w-20 h-20 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-2xl font-bold text-amber-400 shrink-0">
          {(profile.display_name || profile.username)?.[0]?.toUpperCase() ||
            "?"}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">
                {profile.display_name || profile.username}
              </h1>
              <p className="text-zinc-400 text-sm">@{profile.username}</p>
            </div>
            {!isOwnProfile && currentUserId && (
              <button
                onClick={handleFollow}
                disabled={followLoading}
                className={`ml-auto px-4 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                  isFollowing
                    ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700"
                    : "bg-amber-400 text-zinc-900 hover:bg-amber-300"
                }`}
              >
                {isFollowing ? (
                  <>
                    <UserMinus className="w-4 h-4" />
                    Unfollow
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Follow
                  </>
                )}
              </button>
            )}
          </div>
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
            <p className="text-zinc-400 text-sm">No ratings yet.</p>
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
              const reviewData = rating.reviews as unknown as
                | { body: string }
                | { body: string }[]
                | null;
              const reviewBody = Array.isArray(reviewData)
                ? reviewData[0]?.body || null
                : reviewData?.body || null;

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
