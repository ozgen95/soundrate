# SoundRate 🎵

A full-stack music rating platform where users rate songs and albums, write reviews, follow friends, and discover what everyone's listening to. Think Letterboxd, but for music.

**Live Demo:** [soundrate.vercel.app](https://soundrate.vercel.app) 

## Features

- **Rate & Review** — Rate individual songs and full albums on a 1–5 scale with optional written reviews
- **Spotify Integration** — Search any song, album, or artist using the Spotify API with automatic metadata caching
- **Community Reviews** — See what others think with aggregated ratings, per-track breakdowns, and community review feeds
- **Social** — Follow other users, browse their profiles and ratings, and stay updated through a personalized activity feed
- **Explore** — Discover trending tracks, new releases, and the highest-rated music on the platform
- **Find Friends** — Search for users by username or display name and follow them directly

## Tech Stack

| Layer      | Technology                                        |
| ---------- | ------------------------------------------------- |
| Frontend   | Next.js 15, TypeScript, Tailwind CSS              |
| Backend    | Next.js API Routes, Supabase                      |
| Database   | PostgreSQL (via Supabase) with Row-Level Security |
| Auth       | Supabase Auth (email/password)                    |
| Music Data | Spotify Web API (Client Credentials flow)         |
| Deployment | Vercel                                            |

## Database Schema

8 tables with RLS policies, indexes, and auto-profile creation triggers:

- **profiles** — User profiles (extends Supabase auth)
- **artists** — Cached artist metadata from Spotify
- **albums** — Cached album metadata with cover art
- **songs** — Individual tracks linked to albums and artists
- **ratings** — Polymorphic ratings for both songs and albums (1–5 scale)
- **reviews** — Optional text reviews tied to ratings
- **follows** — Social graph (follower/following relationships)

The ratings table uses a polymorphic design with a check constraint ensuring each rating targets either a song or an album, with unique constraints preventing duplicate ratings per user per item.

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) account
- A [Spotify Developer](https://developer.spotify.com/dashboard) account

### Setup

1. **Clone the repo**

   ```bash
   git clone https://github.com/ozgen95/soundrate.git
   cd soundrate
   npm install
   ```

2. **Set up Supabase**
   - Create a new Supabase project
   - Run the SQL schema in `supabase/schema.sql` via the SQL Editor
   - Copy your project URL and anon key

3. **Set up Spotify**
   - Create an app at developer.spotify.com/dashboard
   - Add `http://localhost:3000/api/auth/spotify/callback` as a redirect URI
   - Copy your Client ID and Client Secret

4. **Configure environment variables**

   ```bash
   cp .env.local.example .env.local
   ```

   Fill in your keys:

   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SPOTIFY_CLIENT_ID=your_spotify_client_id
   SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
   ```

5. **Run the dev server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/
│   ├── album/[id]/       # Album detail page with ratings and tracklist
│   ├── api/spotify/      # Spotify API proxy routes (search, track, album, trending)
│   ├── auth/             # Login, signup, and OAuth callback
│   ├── explore/          # Trending, new releases, and top-rated content
│   ├── feed/             # Activity feed from followed users
│   ├── friends/          # Find and follow other users
│   ├── profile/          # Current user's profile and ratings
│   ├── search/           # Music search (songs, albums, artists)
│   ├── song/[id]/        # Song detail page with ratings and reviews
│   └── user/[username]/  # Public user profiles
├── components/
│   ├── Navbar.tsx        # Navigation with auth state
│   ├── RatingStars.tsx   # Interactive star rating component
│   └── ReviewCard.tsx    # Community review display card
├── lib/
│   ├── spotify.ts        # Spotify API client (server-side)
│   └── supabase/         # Supabase client configs (browser, server, middleware)
├── types/
│   └── database.ts       # TypeScript types for the database schema
└── middleware.ts          # Session refresh middleware
```

## Deployment

### Vercel (Current)

1. Connect your GitHub repo to [Vercel](https://vercel.com)
2. Add environment variables in the Vercel dashboard
3. Deploy — Vercel auto-detects Next.js and builds accordingly
4. Update Supabase redirect URLs to include your Vercel domain

### AWS (Planned)

Future migration to AWS infrastructure:

- ECS Fargate for containerized Next.js deployment
- RDS PostgreSQL for the database
- S3 + CloudFront for static assets and CDN
- GitHub Actions for CI/CD pipeline
