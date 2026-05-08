// ============================================
// SoundRate Database Types
// ============================================

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface Artist {
  id: string;
  spotify_id: string;
  name: string;
  image_url: string | null;
  genres: string[];
  created_at: string;
}

export interface Album {
  id: string;
  spotify_id: string;
  title: string;
  artist_id: string;
  cover_url: string | null;
  release_date: string | null;
  total_tracks: number;
  created_at: string;
  // Joined fields
  artist?: Artist;
}

export interface Song {
  id: string;
  spotify_id: string;
  title: string;
  artist_id: string;
  album_id: string | null;
  track_number: number | null;
  duration_ms: number | null;
  preview_url: string | null;
  created_at: string;
  // Joined fields
  artist?: Artist;
  album?: Album;
}

export interface Rating {
  id: string;
  user_id: string;
  song_id: string | null;
  album_id: string | null;
  score: number; // 1-5
  created_at: string;
  updated_at: string;
  // Joined fields
  profile?: Profile;
  song?: Song | null;
  album?: Album | null;
  review?: Review;
}

export interface Review {
  id: string;
  user_id: string;
  rating_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  profile?: Profile;
  rating?: Rating;
}

export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
  // Joined fields
  follower?: Profile;
  following?: Profile;
}

// ============================================
// API / Component helper types
// ============================================

export type RatingWithDetails = Omit<Rating, 'profile' | 'song' | 'album' | 'review'> & {
  profile: Profile;
  song: Song | null;
  album: Album | null;
  review: Review | null;
};

export interface SongWithRating extends Song {
  average_rating: number | null;
  total_ratings: number;
  user_rating?: number | null;
}

export interface AlbumWithRating extends Album {
  average_rating: number | null;
  total_ratings: number;
  user_rating?: number | null;
  tracks?: SongWithRating[];
}

export interface ProfileWithStats extends Profile {
  total_ratings: number;
  followers_count: number;
  following_count: number;
  is_following?: boolean;
}
