"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Music, Star, Loader2, ArrowLeft, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import RatingStars from "@/components/RatingStars";
import ReviewCard from "@/components/ReviewCard";

interface AlbumData {
  id: string;
  name: string;
  images: { url: string; width: number; height: number }[];
  release_date: string;
  total_tracks: number;
  artists: { id: string; name: string }[];
  tracks: {
    items: {
      id: string;
      name: string;
      track_number: number;
      duration_ms: number;
      artists: { id: string; name: string }[];
    }[];
  };
}

export default function AlbumPage() {
  const { id } = useParams<{ id: string }>();
  const [album, setAlbum] = useState<AlbumData | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [albumRating, setAlbumRating] = useState<number | null>(null);
  const [avgAlbumRating, setAvgAlbumRating] = useState<number | null>(null);
  const [totalAlbumRatings, setTotalAlbumRatings] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [review, setReview] = useState("");
  const [existingReview, setExistingReview] = useState<string | null>(null);
  const [communityReviews, setCommunityReviews] = useState<
    {
      id: string;
      score: number;
      body: string | null;
      created_at: string;
      username: string;
      display_name: string | null;
    }[]
  >([]);
  const [trackRatings, setTrackRatings] = useState<
    Record<string, { avg: number; count: number }>
  >({});

  const supabase = createClient();

  const loadAlbumRatings = useCallback(
    async (spotifyId: string, currentUserId: string | null) => {
      const { data: dbAlbum } = await supabase
        .from("albums")
        .select("id")
        .eq("spotify_id", spotifyId)
        .single();

      if (!dbAlbum) return;

      const { data: ratings } = await supabase
        .from("ratings")
        .select("score")
        .eq("album_id", dbAlbum.id);

      if (ratings && ratings.length > 0) {
        const avg =
          ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length;
        setAvgAlbumRating(Math.round(avg * 10) / 10);
        setTotalAlbumRatings(ratings.length);
      }

      if (currentUserId) {
        const { data: userRatingData } = await supabase
          .from("ratings")
          .select("score, id, reviews(body)")
          .eq("album_id", dbAlbum.id)
          .eq("user_id", currentUserId)
          .single();

        if (userRatingData) {
          setAlbumRating(userRatingData.score);
          const reviews = userRatingData.reviews as unknown as {
            body: string;
          }[];
          if (reviews && reviews.length > 0) {
            setExistingReview(reviews[0].body);
            setReview(reviews[0].body);
          }
        }
      }

      // Load community reviews
      const { data: allRatings } = await supabase
        .from("ratings")
        .select(
          "id, score, created_at, user_id, reviews(body), profiles:user_id(username, display_name)",
        )
        .eq("album_id", dbAlbum.id)
        .order("created_at", { ascending: false });

      if (allRatings) {
        const reviews = allRatings
          .filter((r) => r.user_id !== currentUserId)
          .map((r) => {
            const profile = r.profiles as unknown as {
              username: string;
              display_name: string | null;
            };
            const reviewData = r.reviews as unknown as
              | { body: string }
              | { body: string }[]
              | null;
            const body = Array.isArray(reviewData)
              ? reviewData[0]?.body || null
              : reviewData?.body || null;
            return {
              id: r.id,
              score: r.score,
              body,
              created_at: r.created_at,
              username: profile?.username || "unknown",
              display_name: profile?.display_name || null,
            };
          });
        setCommunityReviews(reviews);
      }

      // Load per-track ratings
      const { data: albumSongs } = await supabase
        .from("songs")
        .select("spotify_id, id")
        .eq("album_id", dbAlbum.id);

      if (albumSongs && albumSongs.length > 0) {
        const songIds = albumSongs.map((s) => s.id);
        const { data: songRatings } = await supabase
          .from("ratings")
          .select("song_id, score")
          .in("song_id", songIds);

        if (songRatings) {
          const grouped: Record<string, number[]> = {};
          for (const r of songRatings) {
            if (!r.song_id) continue;
            const song = albumSongs.find((s) => s.id === r.song_id);
            if (!song) continue;
            if (!grouped[song.spotify_id]) grouped[song.spotify_id] = [];
            grouped[song.spotify_id].push(r.score);
          }
          const result: Record<string, { avg: number; count: number }> = {};
          for (const [spotifyId, scores] of Object.entries(grouped)) {
            const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
            result[spotifyId] = {
              avg: Math.round(avg * 10) / 10,
              count: scores.length,
            };
          }
          setTrackRatings(result);
        }
      }
    },
    [supabase],
  );

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserId(user?.id || null);

      const res = await fetch(`/api/spotify/album/${id}`);
      const data = await res.json();
      setAlbum(data);
      setLoading(false);

      await loadAlbumRatings(id, user?.id || null);
    }
    load();
  }, [id, supabase.auth, loadAlbumRatings]);

  async function handleRateAlbum(score: number) {
    if (!userId || !album) return;
    setSubmitting(true);

    try {
      const artist = album.artists[0];
      const { data: existingArtist } = await supabase
        .from("artists")
        .select("id")
        .eq("spotify_id", artist.id)
        .single();

      let artistId: string;
      if (existingArtist) {
        artistId = existingArtist.id;
      } else {
        const { data: newArtist } = await supabase
          .from("artists")
          .insert({ spotify_id: artist.id, name: artist.name })
          .select("id")
          .single();
        artistId = newArtist!.id;
      }

      const { data: existingAlbum } = await supabase
        .from("albums")
        .select("id")
        .eq("spotify_id", album.id)
        .single();

      let albumId: string;
      if (existingAlbum) {
        albumId = existingAlbum.id;
      } else {
        const { data: newAlbum } = await supabase
          .from("albums")
          .insert({
            spotify_id: album.id,
            title: album.name,
            artist_id: artistId,
            cover_url: album.images[0]?.url || null,
            release_date: album.release_date,
            total_tracks: album.total_tracks,
          })
          .select("id")
          .single();
        albumId = newAlbum!.id;
      }

      const { data: existingRating } = await supabase
        .from("ratings")
        .select("id")
        .eq("user_id", userId)
        .eq("album_id", albumId)
        .single();

      if (existingRating) {
        await supabase
          .from("ratings")
          .update({ score })
          .eq("id", existingRating.id);
      } else {
        await supabase
          .from("ratings")
          .insert({ user_id: userId, album_id: albumId, score });
      }

      setAlbumRating(score);
      await loadAlbumRatings(id, userId);
    } catch (err) {
      console.error("Album rating failed:", err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReviewSubmit() {
    if (!userId || !album || !review.trim()) return;
    setSubmitting(true);

    try {
      const { data: dbAlbum } = await supabase
        .from("albums")
        .select("id")
        .eq("spotify_id", album.id)
        .single();

      if (!dbAlbum) return;

      const { data: rating } = await supabase
        .from("ratings")
        .select("id")
        .eq("user_id", userId)
        .eq("album_id", dbAlbum.id)
        .single();

      if (!rating) return;

      const { data: existingReviewData } = await supabase
        .from("reviews")
        .select("id")
        .eq("rating_id", rating.id)
        .single();

      if (existingReviewData) {
        await supabase
          .from("reviews")
          .update({ body: review.trim() })
          .eq("id", existingReviewData.id);
      } else {
        await supabase.from("reviews").insert({
          user_id: userId,
          rating_id: rating.id,
          body: review.trim(),
        });
      }

      setExistingReview(review.trim());
      await loadAlbumRatings(id, userId);
    } catch (err) {
      console.error("Review failed:", err);
    } finally {
      setSubmitting(false);
    }
  }

  function formatDuration(ms: number) {
    const min = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    return `${min}:${sec.toString().padStart(2, "0")}`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 text-zinc-500 animate-spin" />
      </div>
    );
  }

  if (!album) {
    return (
      <div className="text-center py-32 text-zinc-400">Album not found</div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link
        href="/search"
        className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-white transition text-sm mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to search
      </Link>

      {/* Album header */}
      <div className="flex flex-col sm:flex-row gap-6 mb-8">
        {album.images[0] ? (
          <img
            src={album.images[0].url}
            alt={album.name}
            className="w-48 h-48 rounded-xl object-cover shadow-2xl shrink-0"
          />
        ) : (
          <div className="w-48 h-48 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0">
            <Music className="w-16 h-16 text-zinc-600" />
          </div>
        )}
        <div className="flex flex-col justify-end">
          <p className="text-zinc-400 text-sm uppercase tracking-wider mb-1">
            Album
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            {album.name}
          </h1>
          <p className="text-zinc-300 text-lg">
            {album.artists.map((a) => a.name).join(", ")}
          </p>
          <p className="text-zinc-500 text-sm mt-1">
            {album.release_date?.slice(0, 4)} · {album.total_tracks} tracks
          </p>

          {avgAlbumRating !== null && (
            <div className="flex items-center gap-2 mt-4">
              <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
              <span className="text-white font-semibold text-lg">
                {avgAlbumRating}
              </span>
              <span className="text-zinc-500 text-sm">
                ({totalAlbumRatings}{" "}
                {totalAlbumRatings === 1 ? "rating" : "ratings"})
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Album rating section */}
      {userId ? (
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6 mb-8">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
            {albumRating ? "Your Album Rating" : "Rate this album"}
          </h2>
          <RatingStars
            rating={albumRating}
            onRate={handleRateAlbum}
            disabled={submitting}
          />

          {albumRating && (
            <div className="mt-6">
              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder="Write a review (optional)..."
                rows={3}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition resize-none text-sm"
              />
              <button
                onClick={handleReviewSubmit}
                disabled={
                  submitting ||
                  !review.trim() ||
                  review.trim() === existingReview
                }
                className="mt-2 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-zinc-900 font-semibold rounded-lg text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {existingReview ? "Update review" : "Post review"}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6 mb-8 text-center">
          <p className="text-zinc-400 text-sm">
            <Link
              href="/auth/login"
              className="text-amber-400 hover:text-amber-300 font-medium"
            >
              Sign in
            </Link>{" "}
            to rate this album
          </p>
        </div>
      )}

      {/* Tracklist */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
          Tracklist
        </h2>
        <div className="space-y-0.5">
          {album.tracks.items.map((track) => (
            <Link
              key={track.id}
              href={`/song/${track.id}`}
              className="flex items-center gap-4 p-3 rounded-lg hover:bg-zinc-900/80 transition group"
            >
              <span className="w-6 text-right text-zinc-500 text-sm shrink-0">
                {track.track_number}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-white truncate group-hover:text-amber-400 transition text-sm">
                  {track.name}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {trackRatings[track.id] && (
                  <span className="flex items-center gap-1 text-sm">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span className="text-zinc-300">
                      {trackRatings[track.id].avg}
                    </span>
                    <span className="text-zinc-600 text-xs">
                      ({trackRatings[track.id].count})
                    </span>
                  </span>
                )}
                <span className="flex items-center gap-1.5 text-zinc-500 text-sm">
                  <Clock className="w-3.5 h-3.5" />
                  {formatDuration(track.duration_ms)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Community Reviews */}
      {communityReviews.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
            Community Reviews ({communityReviews.length})
          </h2>
          <div className="space-y-3">
            {communityReviews.map((r) => (
              <ReviewCard
                key={r.id}
                username={r.username}
                displayName={r.display_name}
                score={r.score}
                body={r.body}
                createdAt={r.created_at}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
