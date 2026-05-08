import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Star, Users, Music } from "lucide-react";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Get rating count
  const { count: ratingsCount } = await supabase
    .from("ratings")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  // Get follower/following counts
  const { count: followersCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("following_id", user.id);

  const { count: followingCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("follower_id", user.id);

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      {/* Profile header */}
      <div className="flex items-start gap-6 mb-10">
        <div className="w-20 h-20 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-2xl font-bold text-amber-400 shrink-0">
          {profile?.display_name?.[0]?.toUpperCase() || "?"}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">
            {profile?.display_name || profile?.username}
          </h1>
          <p className="text-zinc-400 text-sm">@{profile?.username}</p>
          {profile?.bio && (
            <p className="text-zinc-300 mt-2 text-sm">{profile.bio}</p>
          )}

          <div className="flex gap-6 mt-4">
            <div className="flex items-center gap-1.5 text-sm">
              <Star className="w-4 h-4 text-amber-400" />
              <span className="text-white font-medium">{ratingsCount || 0}</span>
              <span className="text-zinc-500">ratings</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <Users className="w-4 h-4 text-zinc-400" />
              <span className="text-white font-medium">{followersCount || 0}</span>
              <span className="text-zinc-500">followers</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <span className="text-white font-medium">{followingCount || 0}</span>
              <span className="text-zinc-500">following</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent ratings placeholder */}
      <div className="border-t border-zinc-800 pt-8">
        <h2 className="text-lg font-semibold text-white mb-4">Recent Ratings</h2>
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-8 text-center">
          <Music className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400 text-sm">
            No ratings yet. Start exploring music to rate songs and albums!
          </p>
        </div>
      </div>
    </div>
  );
}
