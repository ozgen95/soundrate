import Link from "next/link";
import { Music, Star, Users, ListMusic, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If logged in, redirect to explore
  if (user) {
    redirect("/explore");
  }

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-4 pt-24 pb-20">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400 text-sm font-medium mb-8">
          <Music className="w-4 h-4" />
          Now in beta
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight max-w-3xl leading-[1.1]">
          Rate the music
          <br />
          <span className="text-amber-400">you love</span>
        </h1>

        <p className="text-zinc-400 text-lg md:text-xl mt-6 max-w-xl leading-relaxed">
          Rate songs and albums, write reviews, follow friends, and discover
          what everyone&apos;s listening to.
        </p>

        <div className="flex gap-4 mt-10">
          <Link
            href="/auth/signup"
            className="px-6 py-3 bg-amber-400 hover:bg-amber-300 text-zinc-900 font-semibold rounded-xl transition text-base"
          >
            Get started
          </Link>
          <Link
            href="/explore"
            className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl border border-zinc-700 transition text-base flex items-center gap-2"
          >
            Explore
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 pb-24">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-8">
            <div className="w-10 h-10 rounded-xl bg-amber-400/10 flex items-center justify-center mb-4">
              <Star className="w-5 h-5 text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Rate &amp; Review
            </h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Rate individual songs and full albums on a 1–5 scale. Write
              reviews to share your thoughts with the community.
            </p>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-8">
            <div className="w-10 h-10 rounded-xl bg-amber-400/10 flex items-center justify-center mb-4">
              <Users className="w-5 h-5 text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Follow Friends
            </h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Follow other music lovers and see what they&apos;re rating. Your
              activity feed keeps you in the loop.
            </p>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-8">
            <div className="w-10 h-10 rounded-xl bg-amber-400/10 flex items-center justify-center mb-4">
              <ListMusic className="w-5 h-5 text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Discover Music
            </h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Explore trending tracks, new releases, and see what the community
              rates highest.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
