"use client";

import { useState } from "react";
import { Star } from "lucide-react";

interface RatingStarsProps {
  rating: number | null;
  onRate: (score: number) => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}

export default function RatingStars({
  rating,
  onRate,
  disabled = false,
  size = "lg",
}: RatingStarsProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  const gapClasses = {
    sm: "gap-0.5",
    md: "gap-1",
    lg: "gap-1.5",
  };

  return (
    <div
      className={`flex items-center ${gapClasses[size]}`}
      onMouseLeave={() => setHovered(null)}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const active =
          hovered !== null ? star <= hovered : star <= (rating || 0);
        return (
          <button
            key={star}
            onClick={() => !disabled && onRate(star)}
            onMouseEnter={() => !disabled && setHovered(star)}
            disabled={disabled}
            className={`transition-all ${
              disabled
                ? "cursor-not-allowed opacity-50"
                : "cursor-pointer hover:scale-110"
            }`}
          >
            <Star
              className={`${sizeClasses[size]} transition-colors ${
                active
                  ? "text-amber-400 fill-amber-400"
                  : "text-zinc-600 hover:text-zinc-400"
              }`}
            />
          </button>
        );
      })}
      {rating && <span className="ml-2 text-zinc-400 text-sm">{rating}/5</span>}
    </div>
  );
}
