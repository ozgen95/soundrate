"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Music, LogOut, User, Menu, X, Search } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export default function Navbar() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <nav className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <Music className="w-6 h-6 text-green-500 group-hover:rotate-12 transition-transform" />
          <span className="text-lg font-bold text-white tracking-tight">
            SoundRate
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          <Link
            href="/explore"
            className="text-zinc-400 hover:text-white transition text-sm"
          >
            Explore
          </Link>
          <Link
            href="/friends"
            className="text-zinc-400 hover:text-white transition text-sm"
          >
            Find Friends
          </Link>
          <Link
            href="/search"
            className="text-zinc-400 hover:text-white transition flex items-center gap-1.5 text-sm"
          >
            <Search className="w-4 h-4" />
            Search
          </Link>
          <Link
            href="/feed"
            className="text-zinc-400 hover:text-white transition flex items-center gap-1.5 text-sm"
          >
            Feed
          </Link>
          {user ? (
            <>
              <Link
                href="/profile"
                className="text-zinc-400 hover:text-white transition flex items-center gap-1.5 text-sm"
              >
                <User className="w-4 h-4" />
                Profile
              </Link>
              <button
                onClick={handleSignOut}
                className="text-zinc-400 hover:text-white transition flex items-center gap-1.5 text-sm"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="text-zinc-400 hover:text-white transition text-sm"
              >
                Sign in
              </Link>
              <Link
                href="/auth/signup"
                className="px-4 py-1.5 bg-green-500 hover:bg-green-400 text-zinc-900 font-semibold rounded-lg text-sm transition"
              >
                Sign up
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden text-zinc-400 hover:text-white transition"
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-zinc-800/50 bg-zinc-950/95 backdrop-blur-xl">
          <div className="px-4 py-4 space-y-3">
            <Link
              href="/explore"
              onClick={() => setMenuOpen(false)}
              className="block text-zinc-300 hover:text-white transition py-1"
            >
              Explore
            </Link>
            <Link
              href="/friends"
              onClick={() => setMenuOpen(false)}
              className="block text-zinc-300 hover:text-white transition py-1"
            >
              Find Friends
            </Link>
            <Link
              href="/search"
              onClick={() => setMenuOpen(false)}
              className="block text-zinc-300 hover:text-white transition py-1"
            >
              Search
            </Link>
            <Link
              href="/feed"
              onClick={() => setMenuOpen(false)}
              className="block text-zinc-300 hover:text-white transition py-1"
            >
              Feed
            </Link>
            {user ? (
              <>
                <Link
                  href="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="block text-zinc-300 hover:text-white transition py-1"
                >
                  Profile
                </Link>
                <button
                  onClick={() => {
                    handleSignOut();
                    setMenuOpen(false);
                  }}
                  className="block text-zinc-300 hover:text-white transition py-1"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  onClick={() => setMenuOpen(false)}
                  className="block text-zinc-300 hover:text-white transition py-1"
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/signup"
                  onClick={() => setMenuOpen(false)}
                  className="block text-green-500 hover:text-green-400 font-semibold transition py-1"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
