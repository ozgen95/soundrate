"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Loader2, Users, UserPlus, UserMinus } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface UserResult {
  id: string;
  username: string;
  display_name: string | null;
  isFollowing: boolean;
}

export default function FindFriendsPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [followLoading, setFollowLoading] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const { data: follows } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", user.id);
        if (follows) {
          setFollowingIds(new Set(follows.map((f) => f.following_id)));
        }
      }
    }
    loadUser();
  }, [supabase]);

  const search = useCallback(
    async (q: string) => {
      if (q.trim().length === 0) {
        setResults([]);
        setSearched(false);
        return;
      }

      setLoading(true);
      try {
        const { data: users } = await supabase
          .from("profiles")
          .select("id, username, display_name")
          .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
          .limit(20);

        const mapped = (users || [])
          .filter((u) => u.id !== currentUserId)
          .map((u) => ({
            ...u,
            isFollowing: followingIds.has(u.id),
          }));

        setResults(mapped);
        setSearched(true);
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setLoading(false);
      }
    },
    [supabase, currentUserId, followingIds],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      search(query);
    }, 400);
    return () => clearTimeout(timer);
  }, [query, search]);

  async function handleFollow(userId: string) {
    if (!currentUserId) return;
    setFollowLoading(userId);

    const isFollowing = followingIds.has(userId);

    if (isFollowing) {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", currentUserId)
        .eq("following_id", userId);
      setFollowingIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
      setResults((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isFollowing: false } : u)),
      );
    } else {
      await supabase
        .from("follows")
        .insert({ follower_id: currentUserId, following_id: userId });
      setFollowingIds((prev) => {
        const next = new Set(prev);
        next.add(userId);
        return next;
      });
      setResults((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isFollowing: true } : u)),
      );
    }

    setFollowLoading(null);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-2">Find Friends</h1>
      <p className="text-zinc-400 text-sm mb-6">
        Search for people to follow and see what they&apos;re listening to.
      </p>

      {/* Search input */}
      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by username or name..."
          autoFocus
          className="w-full pl-12 pr-4 py-3.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition text-base"
        />
        {loading && (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 animate-spin" />
        )}
      </div>

      {/* Results */}
      {!searched && !loading && (
        <div className="text-center py-16">
          <Users className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
          <p className="text-zinc-400">
            Search for friends by their username or display name
          </p>
        </div>
      )}

      {searched && results.length === 0 && (
        <div className="text-center py-16">
          <p className="text-zinc-400">
            No users found for &ldquo;{query}&rdquo;
          </p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-4 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/50"
            >
              <Link
                href={`/user/${user.username}`}
                className="flex items-center gap-4 flex-1 min-w-0 group"
              >
                <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                  <span className="text-amber-400 font-bold text-sm">
                    {(user.display_name || user.username)?.[0]?.toUpperCase() ||
                      "?"}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-white font-medium truncate group-hover:text-amber-400 transition">
                    {user.display_name || user.username}
                  </p>
                  <p className="text-zinc-400 text-sm truncate">
                    @{user.username}
                  </p>
                </div>
              </Link>

              {currentUserId && (
                <button
                  onClick={() => handleFollow(user.id)}
                  disabled={followLoading === user.id}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1.5 shrink-0 ${
                    user.isFollowing
                      ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700"
                      : "bg-amber-400 text-zinc-900 hover:bg-amber-300"
                  }`}
                >
                  {user.isFollowing ? (
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
          ))}
        </div>
      )}
    </div>
  );
}
