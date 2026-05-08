"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Music, Clock, Disc3, Star, Loader2, ArrowLeft } from "lucide-react";
import type { SpotifyTrack } from "@/lib/spotify";
import { createClient } from "@/lib/supabase/client";
import RatingStars from "@/components/RatingStars";
import ReviewCard from "@/components/ReviewCard";

export default function SongPage() {
  const { id } = useParams<{ id: string }>();
  const [track, setTrack] = useState<SpotifyTrack | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [totalRatings, setTotalRatings] = useState(0);
  const [review, setReview] = useState("");
  const [existingReview, setExistingReview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
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

  const supabase = createClient();

  const loadRatings = useCallback(
    async (spotifyId: string, currentUserId: string | null) => {
      // Get the song from our DB
      const { data: song } = await supabase
        .from("songs")
        .select("id")
        .eq("spotify_id", spotifyId)
        .single();

      if (!song) return;

      // Get average rating
      const { data: ratings } = await supabase
        .from("ratings")
        .select("score")
        .eq("song_id", song.id);

      if (ratings && ratings.length > 0) {
        const avg =
          ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length;
        setAvgRating(Math.round(avg * 10) / 10);
        setTotalRatings(ratings.length);
      }

      // Get user's rating
      if (currentUserId) {
        const { data: userRatingData } = await supabase
          .from("ratings")
          .select("score, id, reviews(body)")
          .eq("song_id", song.id)
          .eq("user_id", currentUserId)
          .single();

        if (userRatingData) {
          setUserRating(userRatingData.score);
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
        .eq("song_id", song.id)
        .order("created_at", { ascending: false });

      if (allRatings) {
        const reviews = allRatings
          .filter((r) => r.user_id !== currentUserId)
          .map((r) => {
            const profile = r.profiles as unknown as {
              username: string;
              display_name: string | null;
            };
            const reviewArr = r.reviews as unknown as { body: string }[];
            return {
              id: r.id,
              score: r.score,
              body:
                reviewArr && reviewArr.length > 0 ? reviewArr[0].body : null,
              created_at: r.created_at,
              username: profile?.username || "unknown",
              display_name: profile?.display_name || null,
            };
          });
        setCommunityReviews(reviews);
      }
    },
    [supabase],
  );

  useEffect(() => {
    async function load() {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserId(user?.id || null);

      // Fetch track from Spotify
      const res = await fetch(`/api/spotify/track/${id}`);
      const data = await res.json();
      setTrack(data);
      setLoading(false);

      // Load ratings from our DB
      await loadRatings(id, user?.id || null);
    }
    load();
  }, [id, supabase.auth, loadRatings]);

  async function handleRate(score: number) {
    if (!userId || !track) return;
    setSubmitting(true);

    try {
      // Ensure artist exists in our DB
      const artist = track.artists[0];
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

      // Ensure album exists
      const album = track.album;
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

      // Ensure song exists
      const { data: existingSong } = await supabase
        .from("songs")
        .select("id")
        .eq("spotify_id", track.id)
        .single();

      let songId: string;
      if (existingSong) {
        songId = existingSong.id;
      } else {
        const { data: newSong } = await supabase
          .from("songs")
          .insert({
            spotify_id: track.id,
            title: track.name,
            artist_id: artistId,
            album_id: albumId,
            track_number: track.track_number,
            duration_ms: track.duration_ms,
            preview_url: track.preview_url,
          })
          .select("id")
          .single();
        songId = newSong!.id;
      }

      // Upsert rating
      const { data: existingRating } = await supabase
        .from("ratings")
        .select("id")
        .eq("user_id", userId)
        .eq("song_id", songId)
        .single();

      if (existingRating) {
        await supabase
          .from("ratings")
          .update({ score })
          .eq("id", existingRating.id);
      } else {
        await supabase
          .from("ratings")
          .insert({ user_id: userId, song_id: songId, score });
      }

      setUserRating(score);
      await loadRatings(id, userId);
    } catch (err) {
      console.error("Rating failed:", err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReviewSubmit() {
    if (!userId || !track || !review.trim()) return;
    setSubmitting(true);

    try {
      const { data: song } = await supabase
        .from("songs")
        .select("id")
        .eq("spotify_id", track.id)
        .single();

      if (!song) return;

      const { data: rating } = await supabase
        .from("ratings")
        .select("id")
        .eq("user_id", userId)
        .eq("song_id", song.id)
        .single();

      if (!rating) return;

      // Check if review exists
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
      await loadRatings(id, userId);
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

  if (!track) {
    return (
      <div className="text-center py-32 text-zinc-400">Track not found</div>
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

      {/* Track header */}
      <div className="flex flex-col sm:flex-row gap-6 mb-8">
        {track.album.images[0] ? (
          <img
            src={track.album.images[0].url}
            alt={track.album.name}
            className="w-48 h-48 rounded-xl object-cover shadow-2xl shrink-0"
          />
        ) : (
          <div className="w-48 h-48 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0">
            <Music className="w-16 h-16 text-zinc-600" />
          </div>
        )}
        <div className="flex flex-col justify-end">
          <p className="text-zinc-400 text-sm uppercase tracking-wider mb-1">
            Song
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            {track.name}
          </h1>
          <p className="text-zinc-300 text-lg">
            {track.artists.map((a) => a.name).join(", ")}
          </p>
          <div className="flex items-center gap-4 mt-3 text-sm text-zinc-400">
            <Link
              href={`/album/${track.album.id}`}
              className="flex items-center gap-1.5 hover:text-amber-400 transition"
            >
              <Disc3 className="w-4 h-4" />
              {track.album.name}
            </Link>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {formatDuration(track.duration_ms)}
            </span>
          </div>

          {/* Average rating display */}
          {avgRating !== null && (
            <div className="flex items-center gap-2 mt-4">
              <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
              <span className="text-white font-semibold text-lg">
                {avgRating}
              </span>
              <span className="text-zinc-500 text-sm">
                ({totalRatings} {totalRatings === 1 ? "rating" : "ratings"})
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Rating section */}
      {userId ? (
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6 mb-6">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
            {userRating ? "Your Rating" : "Rate this song"}
          </h2>
          <RatingStars
            rating={userRating}
            onRate={handleRate}
            disabled={submitting}
          />

          {/* Review form (only show after rating) */}
          {userRating && (
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
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6 mb-6 text-center">
          <p className="text-zinc-400 text-sm">
            <Link
              href="/auth/login"
              className="text-amber-400 hover:text-amber-300 font-medium"
            >
              Sign in
            </Link>{" "}
            to rate this song
          </p>
        </div>
      )}

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
