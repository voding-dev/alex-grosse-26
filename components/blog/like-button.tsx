"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LikeButtonProps {
  postId: Id<"blogPosts">;
  initialLikeCount: number;
}

export function LikeButton({ postId, initialLikeCount }: LikeButtonProps) {
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [hasLiked, setHasLiked] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const incrementLikeCount = useMutation(api.blogPosts.incrementLikeCount);

  // Check if user has already liked this post (from localStorage)
  useEffect(() => {
    const likedPosts = JSON.parse(localStorage.getItem("likedPosts") || "[]");
    setHasLiked(likedPosts.includes(postId));
  }, [postId]);

  const handleLike = async () => {
    if (hasLiked) return;

    try {
      // Optimistic update
      setLikeCount((prev) => prev + 1);
      setHasLiked(true);
      setIsAnimating(true);

      // Update in database
      await incrementLikeCount({ id: postId });

      // Store in localStorage
      const likedPosts = JSON.parse(localStorage.getItem("likedPosts") || "[]");
      likedPosts.push(postId);
      localStorage.setItem("likedPosts", JSON.stringify(likedPosts));

      // Reset animation after delay
      setTimeout(() => setIsAnimating(false), 600);
    } catch (error) {
      console.error("Failed to like post:", error);
      // Revert optimistic update on error
      setLikeCount((prev) => prev - 1);
      setHasLiked(false);
    }
  };

  return (
    <Button
      onClick={handleLike}
      disabled={hasLiked}
      variant="ghost"
      className={`
        flex items-center gap-2 h-auto px-0 py-0
        hover:bg-transparent
        ${hasLiked ? "cursor-default" : "cursor-pointer"}
        transition-all duration-200
      `}
    >
      <Heart
        className={`
          h-4 w-4 sm:h-5 sm:w-5 transition-all duration-300
          ${hasLiked ? "fill-red-500 text-red-500" : "text-black/60"}
          ${isAnimating ? "scale-125" : "scale-100"}
          ${!hasLiked && "hover:text-red-500 hover:scale-110"}
        `}
      />
      <span className="font-medium text-sm sm:text-base text-black/60">
        {likeCount}
      </span>
    </Button>
  );
}

