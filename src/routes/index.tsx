import { createFileRoute, Link } from "@tanstack/react-router";
import { GAME_TEAMS_SELECT, gameMatchup } from "@/lib/game-teams";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import ssnLogo from "@/assets/ssn-logo.png";
import { getYoutubeFeed } from "@/lib/youtube.functions";
import { mediaUrl } from "@/lib/media";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SSN Live — Sabercat Sports Network" },
      { name: "description", content: "Articles, live video, and football coverage from Sabercat Sports Network." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const fetchYoutube = useServerFn(getYoutubeFeed);

  const articles = useQuery({
    queryKey: ["articles", "home"],
    queryFn: async () => {
      const { data } = await supabase
      .from("articles").select("*").eq("published", true)
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false }).limit(3);
      return data ?? [];
    },
  });

  const yt = useQuery({
    queryKey: ["youtube-feed"],
    queryFn: () => fetchYoutube(),
                      refetchInterval: 60_000,
  });

  const games = useQuery({
    queryKey: ["games", "recent-by-sport"],
    queryFn: async () => {
      const { data } = await supabase
      .from("games")
      .select(GAME_TEAMS_SELECT)
      .order("game_date", { ascending: false }).limit(40);
      return data ?? [];
    },
  });

  const ig = useQuery({
    queryKey: ["instagram-home"],
    queryFn: async () => (await supabase.from("instagram_posts").select("*").order("sort_order").limit(4)).data ?? [],
  });

  const settings = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => (await supabase.from("site_settings").select("*").eq("id", true).maybeSingle()).data,
  });

  const live = yt.data?.live;
  const igHandle = settings.data?.instagram_handle ?? "sabercatsports";
  const liveGame = games.data?.find((g) => g.status === "live");

  return (
    <div className="container mx-auto px-4 py-10 space-y-14">
    {/* Hero */}
    <section className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-secondary p-8 md:p-14 animate-fade-up">
    <div className="absolute inset-0 opacity-20 pointer-events-none"
    style={{ backgroundImage: "repeating-linear-gradient(90deg, transparent, transparent 60px, oklch(0.62 0.18 145 / 0.3) 60px, oklch(0.62 0.18 145 / 0.3) 61px)" }} />
    <div className="relative flex flex-col md:flex-row items-center gap-8">
    <img src={ssnLogo} alt="SSN" className="h-32 w-32 md:h-44 md:w-44 object-contain drop-shadow-[0_0_30px_oklch(0.62_0.18_145_/_0.5)] shrink-0 transition-transform duration-500 hover:scale-105" />
    <div className="flex-1 text-center md:text-left">
    <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/30 px-3 py-1 text-xs font-display tracking-widest text-primary">
    <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
    {live ? "LIVE NOW" : liveGame ? "GAME LIVE" : "SABERCAT SPORTS NETWORK"}
    </div>
    <h1 className="mt-4 font-display text-5xl md:text-7xl text-foreground">
    SSN <span className="text-primary">Live</span>
    </h1>
    <p className="mt-4 max-w-2xl text-muted-foreground">
    The home of Sabercat sports — stories, video, and live coverage in one place.
    </p>
    <div className="mt-6 flex flex-wrap gap-3 justify-center md:justify-start">
    <Link to="/watch" className="rounded-md bg-primary px-5 py-3 font-display tracking-wide text-primary-foreground hover:opacity-90 hover:-translate-y-0.5 transition-all duration-200">
    {live ? "Watch Live ▶" : "Watch"}
    </Link>
    <Link to="/articles" className="rounded-md border border-border px-5 py-3 font-display tracking-wide hover:border-primary hover:text-primary hover:-translate-y-0.5 transition-all duration-200">
    Read Articles
    </Link>
    <Link to="/sports" className="rounded-md border border-border px-5 py-3 font-display tracking-wide hover:border-primary hover:text-primary hover:-translate-y-0.5 transition-all duration-200">
    Sports
    </Link>
    </div>
    </div>
    </div>
    </section>

    {/* Live banner */}
    {live && (
      <section>
      <SectionHeading title="Live Now" accent />
      <Link to="/watch">
      <Card className="overflow-hidden hover:border-primary transition">
      <div className="grid md:grid-cols-[1.5fr_1fr]">
      {live.thumbnail && <img src={live.thumbnail} alt="" className="aspect-video w-full object-cover" />}
      <div className="p-6 flex flex-col justify-center">
      <div className="text-xs font-display tracking-widest text-primary">● LIVE ON YOUTUBE</div>
      <h3 className="mt-2 font-display text-2xl">{live.title}</h3>
      <div className="mt-4 text-sm text-primary">Tap to watch →</div>
      </div>
      </div>
      </Card>
      </Link>
      </section>
    )}

    {/* Articles */}
    <section>
    <SectionRow title="Latest Articles" to="/articles" />
    {articles.data && articles.data.length > 0 ? (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {articles.data.map((a) => (
        <Link key={a.id} to="/articles/$slug" params={{ slug: a.slug }}>
        <Card className="overflow-hidden hover:border-primary transition group h-full flex flex-col">
        {a.cover_url ? (
          <img src={mediaUrl(a.cover_url)} alt="" className="aspect-video w-full object-cover" />
        ) : (
          <div className="aspect-video w-full bg-gradient-to-br from-secondary to-card flex items-center justify-center font-display text-primary/30 text-3xl tracking-widest">SSN</div>
        )}
        <div className="p-5 flex-1 flex flex-col">
        {a.category && <div className="text-[10px] uppercase tracking-widest text-primary font-display mb-2">{a.category}</div>}
        <h3 className="font-display text-lg leading-tight group-hover:text-primary transition">{a.title}</h3>
        {a.excerpt && <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{a.excerpt}</p>}
        </div>
        </Card>
        </Link>
      ))}
      </div>
    ) : (
      <Card className="p-8 text-center border-dashed text-muted-foreground">No articles yet — staff can publish from admin.</Card>
    )}
    </section>

    {/* Videos */}
    {yt.data?.videos && yt.data.videos.length > 0 && (
      <section>
      <SectionRow title="Latest Videos" to="/watch" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {yt.data.videos.slice(0, 4).map((v) => (
        <a key={v.videoId} href={`https://youtu.be/${v.videoId}`} target="_blank" rel="noreferrer">
        <Card className="overflow-hidden hover:border-primary transition group">
        {v.thumbnail && <img src={v.thumbnail} alt="" className="aspect-video w-full object-cover" />}
        <div className="p-3">
        <div className="font-display text-sm leading-tight line-clamp-2 group-hover:text-primary transition">{v.title}</div>
        </div>
        </Card>
        </a>
      ))}
      </div>
      </section>
    )}

    {/* Sports — variety with most recent game per sport */}
    <section>
    <SectionRow title="Sabercat Sports" to="/sports" />
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-stagger">
    {[
      { slug: "football",   label: "Football",   emoji: "🏈" },
      { slug: "basketball", label: "Basketball", emoji: "🏀" },
      { slug: "volleyball", label: "Volleyball", emoji: "🏐" },
      { slug: "baseball",   label: "Baseball",   emoji: "⚾" },
    ].map((s) => {
      const g = games.data?.find((x) => x.sport === s.slug);
      return (
        <Link key={s.slug} to="/sports/$sport" params={{ sport: s.slug }}>
        <Card className="p-5 h-full hover:border-primary transition hover-lift">
        <div className="flex items-center justify-between">
        <div className="text-4xl">{s.emoji}</div>
        <div className="text-[10px] font-display tracking-widest text-primary">VIEW →</div>
        </div>
        <div className="mt-3 font-display text-xl tracking-wider">{s.label}</div>
        {g ? (
          <div className="mt-3 text-xs text-muted-foreground">
          <div className="font-display text-sm text-foreground">
          {gameMatchup(g).home.short} vs {gameMatchup(g).away.short}
          </div>

          <div className="mt-1 flex items-center gap-2">
          <span className={`px-1.5 py-0.5 rounded text-[9px] ${g.status === "live" ? "bg-primary/20 text-primary" : "bg-secondary"}`}>{g.status?.toUpperCase()}</span>
          <span className="scoreboard">{g.home_score}–{g.away_score}</span>
          </div>
          </div>
        ) : (
          <div className="mt-3 text-xs text-muted-foreground">Schedule coming soon.</div>
        )}
        </Card>
        </Link>
      );
    })}
    </div>
    </section>

    {/* Instagram */}
    <section>
    <SectionRow title="From Instagram" to="/watch" linkLabel={`@${igHandle}`} external={`https://www.instagram.com/${igHandle}/`} />
    {ig.data && ig.data.length > 0 ? (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {ig.data.map((p) => (
        <a key={p.id} href={p.post_url} target="_blank" rel="noreferrer">
        <Card className="overflow-hidden hover:border-primary transition">
        {p.thumbnail_url ? (
          <img src={mediaUrl(p.thumbnail_url)} alt="" className="aspect-square w-full object-cover" />
        ) : (
          <div className="aspect-square bg-gradient-to-br from-secondary to-card flex items-center justify-center font-display text-primary/30 text-xl">IG</div>
        )}
        </Card>
        </a>
      ))}
      </div>
    ) : (
      <Card className="p-6 border-dashed text-center text-muted-foreground">
      Follow <a className="text-primary" href={`https://www.instagram.com/${igHandle}/`} target="_blank" rel="noreferrer">@{igHandle}</a> for the latest.
      </Card>
    )}
    </section>
    </div>
  );
}

export function SectionHeading({ title, accent }: { title: string; accent?: boolean }) {
  return (
    <div className="flex items-center gap-3 mb-4">
    <div className={`h-6 w-1 rounded-full ${accent ? "bg-primary animate-pulse" : "bg-primary"}`} />
    <h2 className="font-display text-2xl tracking-wider">{title}</h2>
    </div>
  );
}

function SectionRow({ title, to, linkLabel, external }: { title: string; to?: string; linkLabel?: string; external?: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-3">
    <div className="h-6 w-1 bg-primary rounded-full" />
    <h2 className="font-display text-2xl tracking-wider">{title}</h2>
    </div>
    {external ? (
      <a href={external} target="_blank" rel="noreferrer" className="text-xs font-display tracking-widest text-primary hover:underline">{linkLabel ?? "View all"} ↗</a>
    ) : to ? (
      <Link to={to} className="text-xs font-display tracking-widest text-primary hover:underline">{linkLabel ?? "View all"} →</Link>
    ) : null}
    </div>
  );
}
