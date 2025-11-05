/**
 * Utility functions for handling YouTube and Vimeo video URLs
 */

export type VideoPlatform = "youtube" | "vimeo" | null;

export interface VideoInfo {
  platform: VideoPlatform;
  videoId: string;
  embedUrl: string;
  thumbnailUrl: string;
}

/**
 * Extract video ID and platform from YouTube URL
 */
function parseYouTubeUrl(url: string): { videoId: string | null; platform: "youtube" } | null {
  // Various YouTube URL formats:
  // https://www.youtube.com/watch?v=VIDEO_ID
  // https://youtube.com/watch?v=VIDEO_ID&t=123
  // https://www.youtube.com/embed/VIDEO_ID
  // https://youtu.be/VIDEO_ID?t=123
  // https://youtube.com/shorts/VIDEO_ID
  
  // Match video ID (11 characters) from various YouTube URL formats
  // Video ID is always exactly 11 alphanumeric characters, underscore, or hyphen
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})(?:[?&]|$)/,
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return { videoId: match[1], platform: "youtube" };
    }
  }
  
  return null;
}

/**
 * Extract video ID and platform from Vimeo URL
 */
function parseVimeoUrl(url: string): { videoId: string | null; platform: "vimeo" } | null {
  // Vimeo URL formats:
  // https://vimeo.com/VIDEO_ID
  // https://player.vimeo.com/video/VIDEO_ID
  
  const patterns = [
    /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return { videoId: match[1], platform: "vimeo" };
    }
  }
  
  return null;
}

/**
 * Parse a video URL and return platform and video ID
 */
export function parseVideoUrl(url: string): VideoInfo | null {
  // Try YouTube first
  const youtubeMatch = parseYouTubeUrl(url);
  if (youtubeMatch && youtubeMatch.videoId) {
    return {
      platform: "youtube",
      videoId: youtubeMatch.videoId,
      embedUrl: `https://www.youtube.com/embed/${youtubeMatch.videoId}`,
      thumbnailUrl: `https://img.youtube.com/vi/${youtubeMatch.videoId}/maxresdefault.jpg`,
    };
  }
  
  // Try Vimeo
  const vimeoMatch = parseVimeoUrl(url);
  if (vimeoMatch && vimeoMatch.videoId) {
    return {
      platform: "vimeo",
      videoId: vimeoMatch.videoId,
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch.videoId}`,
      thumbnailUrl: `https://vumbnail.com/${vimeoMatch.videoId}.jpg`, // Using vumbnail service for Vimeo thumbnails
    };
  }
  
  return null;
}

/**
 * Check if a URL is a valid YouTube or Vimeo URL
 */
export function isValidVideoUrl(url: string): boolean {
  return parseVideoUrl(url) !== null;
}

/**
 * Get video embed HTML for iframe
 */
export function getVideoEmbedUrl(url: string): string | null {
  const videoInfo = parseVideoUrl(url);
  return videoInfo?.embedUrl || null;
}

/**
 * Get video thumbnail URL
 */
export function getVideoThumbnailUrl(url: string): string | null {
  const videoInfo = parseVideoUrl(url);
  return videoInfo?.thumbnailUrl || null;
}

