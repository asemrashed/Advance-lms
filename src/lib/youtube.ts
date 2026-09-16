/** Extract a YouTube video ID from common URL formats or return the raw id. */
export function extractYoutubeVideoId(input: string): string | undefined {
  const trimmed = input.trim();
  if (!trimmed) return undefined;

  // Accept bare IDs (YouTube IDs are 11 chars; schema allows 10–15).
  if (/^[a-zA-Z0-9_-]{10,15}$/.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = url.pathname.slice(1).split("/")[0];
      return /^[a-zA-Z0-9_-]{10,15}$/.test(id || "") ? id : undefined;
    }

    if (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "music.youtube.com" ||
      host === "youtube-nocookie.com"
    ) {
      const v = url.searchParams.get("v");
      if (v && /^[a-zA-Z0-9_-]{10,15}$/.test(v)) return v;
      const embedMatch = url.pathname.match(/\/embed\/([a-zA-Z0-9_-]{10,15})/);
      if (embedMatch) return embedMatch[1];
      const shortsMatch = url.pathname.match(/\/shorts\/([a-zA-Z0-9_-]{10,15})/);
      if (shortsMatch) return shortsMatch[1];
      const liveMatch = url.pathname.match(/\/live\/([a-zA-Z0-9_-]{10,15})/);
      if (liveMatch) return liveMatch[1];
    }
  } catch {
    // Fall through — maybe the string contains a watch URL without a scheme.
  }

  const loose = trimmed.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{10,15})/,
  );
  if (loose) return loose[1];

  return undefined;
}

/** Normalize free-text YouTube URL/ID fields into a stored video id. */
export function normalizeYoutubeVideoId(
  youtubeVideoId?: string | null,
  videoUrl?: string | null,
): string | undefined {
  return (
    extractYoutubeVideoId(String(youtubeVideoId || "")) ||
    extractYoutubeVideoId(String(videoUrl || "")) ||
    undefined
  );
}

export function getYoutubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`;
}
