import { createServerFn } from "@tanstack/react-start";

// Returns live + recent video info for the SSN YouTube channel.
// Gracefully degrades when YOUTUBE_API_KEY is missing — UI falls back to a
// channel embed and a "Watch on YouTube" button.
export const getYoutubeFeed = createServerFn({ method: "GET" }).handler(async () => {
  const apiKey = process.env.GOOGLE_API_KEY ?? process.env.YOUTUBE_API_KEY;

  // Pull channel handle from settings (admin-editable). Lazy import keeps server-only code off the client.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: settings } = await supabaseAdmin
    .from("site_settings")
    .select("youtube_channel_id, youtube_handle")
    .eq("id", true)
    .maybeSingle();

  const handle = settings?.youtube_handle ?? "sabercatsports3774";
  let channelId = settings?.youtube_channel_id ?? null;

  if (!apiKey) {
    return { configured: false, channelId, handle, live: null, videos: [] as YtVideo[] };
  }

  try {
    // Resolve channel ID once and cache it.
    if (!channelId) {
      const r = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=@${encodeURIComponent(handle)}&key=${apiKey}`,
      );
      const j = await r.json();
      channelId = j?.items?.[0]?.id ?? null;
      if (channelId) {
        await supabaseAdmin.from("site_settings").update({ youtube_channel_id: channelId }).eq("id", true);
      }
    }
    if (!channelId) return { configured: true, channelId: null, handle, live: null, videos: [] };

    // Look for an active live broadcast.
    const liveRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&eventType=live&type=video&key=${apiKey}`,
    );
    const liveJson = await liveRes.json();
    const liveItem = liveJson?.items?.[0];
    const live: YtVideo | null = liveItem
      ? {
          videoId: liveItem.id.videoId,
          title: liveItem.snippet.title,
          thumbnail: liveItem.snippet.thumbnails?.high?.url ?? null,
          publishedAt: liveItem.snippet.publishedAt,
        }
      : null;

    // Recent uploads.
    const recRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&type=video&maxResults=8&key=${apiKey}`,
    );
    const recJson = await recRes.json();
    const videos: YtVideo[] = (recJson?.items ?? []).map((it: any) => ({
      videoId: it.id.videoId,
      title: it.snippet.title,
      thumbnail: it.snippet.thumbnails?.high?.url ?? it.snippet.thumbnails?.medium?.url ?? null,
      publishedAt: it.snippet.publishedAt,
    }));

    return { configured: true, channelId, handle, live, videos };
  } catch (e) {
    console.error("YouTube fetch failed", e);
    return { configured: true, channelId, handle, live: null, videos: [] as YtVideo[], error: "fetch_failed" };
  }
});

export type YtVideo = {
  videoId: string;
  title: string;
  thumbnail: string | null;
  publishedAt: string;
};
