import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { getYoutubeFeed } from "@/lib/youtube.functions";
import { mediaUrl } from "@/lib/media";

export const Route = createFileRoute("/watch")({
  head: () => ({
    meta: [
      { title: "Watch — SSN Live" },
      { name: "description", content: "Live streams, highlights, and Instagram from Sabercat Sports Network." },
    ],
  }),
  component: WatchPage,
});

function WatchPage() {
  const fetchYoutube = useServerFn(getYoutubeFeed);
  const yt = useQuery({
    queryKey: ["youtube-feed"],
    queryFn: () => fetchYoutube(),
    refetchInterval: 60_000,
  });

  const ig = useQuery({
    queryKey: ["instagram-posts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("instagram_posts")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const settings = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () =>
      (await supabase.from("site_settings").select("*").eq("id", true).maybeSingle()).data,
  });

  const handle = yt.data?.handle ?? "sabercatsports3774";
  const igHandle = settings.data?.instagram_handle ?? "sabercatsports";
  const live = yt.data?.live;

  return (
    <div className="container mx-auto px-4 py-10 space-y-12">
      {/* Live or featured player */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="h-6 w-1 bg-primary rounded-full" />
          <h1 className="font-display text-3xl tracking-wider">
            {live ? <><span className="text-primary animate-pulse">● LIVE</span> on YouTube</> : "SSN on YouTube"}
          </h1>
        </div>
        <Card className="overflow-hidden">
          <div className="aspect-video w-full bg-black">
            {live ? (
              <iframe
                src={`https://www.youtube.com/embed/${live.videoId}?autoplay=1`}
                title={live.title}
                allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            ) : yt.data?.channelId ? (
              <iframe
                src={`https://www.youtube.com/embed?listType=user_uploads&list=${yt.data.channelId}`}
                title="SSN YouTube"
                allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                <div className="font-display text-xl">SSN on YouTube</div>
                <a
                  href={`https://www.youtube.com/@${handle}`}
                  target="_blank" rel="noreferrer"
                  className="mt-4 inline-flex rounded-md bg-primary px-5 py-3 text-primary-foreground font-display tracking-wide"
                >
                  Watch on YouTube ↗
                </a>
              </div>
            )}
          </div>
          {live && <div className="p-4 font-display">{live.title}</div>}
        </Card>
        <div className="mt-3 text-xs text-muted-foreground">
          {yt.data && !yt.data.configured && (
            <>YouTube auto-live detection is offline until an API key is added in admin. The channel embed still works.</>
          )}
        </div>
      </section>

      {/* Recent videos */}
      {yt.data?.videos && yt.data.videos.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-6 w-1 bg-primary rounded-full" />
            <h2 className="font-display text-2xl tracking-wider">Latest Videos</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {yt.data.videos.map((v) => (
              <a key={v.videoId} href={`https://youtu.be/${v.videoId}`} target="_blank" rel="noreferrer">
                <Card className="overflow-hidden hover:border-primary transition group">
                  {v.thumbnail && <img src={v.thumbnail} alt="" className="aspect-video w-full object-cover" />}
                  <div className="p-3">
                    <div className="font-display text-sm leading-tight line-clamp-2 group-hover:text-primary transition">{v.title}</div>
                    <div className="text-[11px] text-muted-foreground mt-1">{new Date(v.publishedAt).toLocaleDateString()}</div>
                  </div>
                </Card>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Instagram */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-6 w-1 bg-primary rounded-full" />
            <h2 className="font-display text-2xl tracking-wider">From Instagram</h2>
          </div>
          <a
            href={`https://www.instagram.com/${igHandle}/`}
            target="_blank" rel="noreferrer"
            className="text-xs font-display tracking-widest text-primary hover:underline"
          >
            @{igHandle} ↗
          </a>
        </div>
        {ig.data && ig.data.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ig.data.map((p) => (
              <a key={p.id} href={p.post_url} target="_blank" rel="noreferrer">
                <Card className="overflow-hidden hover:border-primary transition group">
                  {p.thumbnail_url ? (
                    <img src={mediaUrl(p.thumbnail_url)} alt="" className="aspect-square w-full object-cover" />
                  ) : (
                    <div className="aspect-square bg-gradient-to-br from-secondary to-card flex items-center justify-center font-display text-primary/30 text-2xl">IG</div>
                  )}
                  {p.caption && <div className="p-3 text-sm text-muted-foreground line-clamp-2">{p.caption}</div>}
                </Card>
              </a>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center border-dashed">
            <div className="font-display text-muted-foreground">No highlights posted yet.</div>
            <a
              href={`https://www.instagram.com/${igHandle}/`}
              target="_blank" rel="noreferrer"
              className="mt-3 inline-flex rounded-md bg-primary px-4 py-2 text-primary-foreground font-display text-sm tracking-wide"
            >
              Follow @{igHandle}
            </a>
          </Card>
        )}
      </section>
    </div>
  );
}
