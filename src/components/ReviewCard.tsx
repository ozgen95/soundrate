"use client";

import Link from "next/link";
import { Star } from "lucide-react";

interface ReviewCardProps {
  username: string;
  displayName: string | null;
  score: number;
  body: string | null;
  createdAt: string;
}

export default function ReviewCard({
  username,
  displayName,
  score,
  body,
  createdAt,
}: ReviewCardProps) {
  const timeAgo = getTimeAgo(createdAt);

  return (
    <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-green-500 shrink-0">
            {(displayName || username)?.[0]?.toUpperCase() || "?"}
          </div>
          <Link href={`/user/${username}`}>
            <p className="text-white text-sm font-medium hover:text-green-500 transition">
              {displayName || username}
            </p>
            <p className="text-zinc-500 text-xs">@{username}</p>
          </Link>
        </div>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star
              key={s}
              className={`w-3.5 h-3.5 ${
                s <= score ? "text-green-500 fill-green-500" : "text-zinc-700"
              }`}
            />
          ))}
        </div>
      </div>
      {body && <p className="text-zinc-300 text-sm leading-relaxed">{body}</p>}
      <p className="text-zinc-600 text-xs mt-3">{timeAgo}</p>
    </div>
  );
}

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
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}
