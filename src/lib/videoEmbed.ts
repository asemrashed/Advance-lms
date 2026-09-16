/** YouTube / Vimeo embed URL for preview players. */
export function toEmbedVideoUrl(url: string | undefined): string | null {
  if (!url?.trim()) return null;
  const raw = url.trim();
  try {
    const u = new URL(raw);
    if (u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) {
      let id = u.searchParams.get("v");
      if (!id && u.hostname.includes("youtu.be")) {
        id = u.pathname.replace("/", "");
      }
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      if (id) return `https://player.vimeo.com/video/${id}`;
    }
    if (/\.(mp4|webm|ogg)(\?|$)/i.test(u.pathname)) return raw;
  } catch {
    return null;
  }
  return null;
}
