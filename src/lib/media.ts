/**
 * The media bucket is private, so stored "public" storage URLs can't be served
 * directly. Rewrite them to our server proxy which signs the object on demand.
 */
export function mediaUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  const marker = "/storage/v1/object/public/media/";
  const i = url.indexOf(marker);
  if (i === -1) return url;
  return `/api/public/media/${url.slice(i + marker.length)}`;
}
