import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { GAME_TEAMS_SELECT, gameMatchup } from "@/lib/game-teams";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { mediaUrl } from "@/lib/media";

const SPORT_META: Record<string, { label: string; emoji: string }> = {
  football:   { label: "Football",   emoji: "🏈" },
  basketball: { label: "Basketball", emoji: "🏀" },
  volleyball: { label: "Volleyball", emoji: "🏐" },
  baseball:   { label: "Baseball",   emoji: "⚾" },
};

export const Route = createFileRoute("/sports/$sport")({
  beforeLoad: ({ params }) => {
    if (!SPORT_META[params.sport]) throw notFound();
  },
  head: ({ params }) => {
    const m = SPORT_META[params.sport];
    return {
      meta: [
        { title: `${m?.label ?? "Sports"} — SSN Live` },
        { name: "description", content: `${m?.label ?? "SSN"} schedules, rosters and stats from Sabercat Sports Network.` },
      ],
    };
  },
  component: SportPage,
  notFoundComponent: () => (
    <div className="container mx-auto px-4 py-16 text-center">
      <h1 className="font-display text-3xl">Sport not found</h1>
      <Link to="/sports" className="mt-4 inline-block text-primary">Back to sports →</Link>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="container mx-auto px-4 py-16 text-center text-muted-foreground">{error.message}</div>
  ),
});

function SportPage() {
  const { sport } = Route.useParams();
  const meta = SPORT_META[sport];

  const games = useQuery({
    queryKey: ["sport-games", sport],
    queryFn: async () => {
      const { data } = await supabase
        .from("games")
        .select(GAME_TEAMS_SELECT)
        .eq("sport", sport)
        .order("game_date", { ascending: false });
      return data ?? [];
    },
  });

  const players = useQuery({
    queryKey: ["sport-players", sport],
    queryFn: async () => {
      const { data } = await supabase
        .from("players").select("*").eq("sport", sport)
        .order("jersey_number", { ascending: true });
      return data ?? [];
    },
  });

  const teams = useQuery({
    queryKey: ["sport-teams"],
    queryFn: async () => (await supabase.from("teams").select("*").order("name")).data ?? [],
  });

  // Aggregate season stats from player_game_stats for games in this sport
  const stats = useQuery({
    queryKey: ["sport-stats", sport],
    queryFn: async () => {
      const { data: gamesData } = await supabase.from("games").select("id").eq("sport", sport);
      const gameIds = (gamesData ?? []).map((g) => g.id);
      if (gameIds.length === 0) return { leaders: [] as Array<{ name: string; total: number; games: number; key: string }>, statKeys: [] as string[] };
      const { data: rows } = await supabase
        .from("player_game_stats").select("player_name, stats").in("game_id", gameIds);
      const totals = new Map<string, { name: string; sums: Record<string, number>; games: number }>();
      for (const r of rows ?? []) {
        const entry = totals.get(r.player_name) ?? { name: r.player_name, sums: {}, games: 0 };
        entry.games += 1;
        for (const [k, v] of Object.entries((r.stats ?? {}) as Record<string, unknown>)) {
          const n = typeof v === "number" ? v : Number(v);
          if (Number.isFinite(n)) entry.sums[k] = (entry.sums[k] ?? 0) + n;
        }
        totals.set(r.player_name, entry);
      }
      // pick top numeric stat key by total volume across players
      const keyTotals: Record<string, number> = {};
      for (const e of totals.values()) for (const [k, v] of Object.entries(e.sums)) keyTotals[k] = (keyTotals[k] ?? 0) + v;
      const statKeys = Object.entries(keyTotals).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k]) => k);
      const primary = statKeys[0];
      const leaders = primary
        ? Array.from(totals.values())
            .map((e) => ({ name: e.name, total: e.sums[primary] ?? 0, games: e.games, key: primary }))
            .filter((l) => l.total > 0)
            .sort((a, b) => b.total - a.total).slice(0, 10)
        : [];
      return { leaders, statKeys };
    },
  });

  return (
    <div className="container mx-auto px-4 py-10 space-y-10 animate-fade-up">
      <header className="flex items-center gap-4">
        <div className="text-6xl">{meta?.emoji}</div>
        <div>
          <Link to="/sports" className="text-xs font-display tracking-widest text-muted-foreground hover:text-primary">← All sports</Link>
          <h1 className="font-display text-4xl md:text-5xl">{meta?.label}</h1>
        </div>
      </header>

      <section>
        <SectionHeading title="Games" />
        {games.isLoading && <p className="text-muted-foreground">Loading…</p>}
        {games.data && games.data.length > 0 ? (
          <div className="grid gap-3 animate-stagger">
            {games.data.map((g: any) => {
              const card = (
                <Card className="p-4 flex items-center justify-between hover:border-primary transition hover-lift">
                  <div className="flex items-center gap-4">
                    {g.opponent_team?.logo_url ? (
                      <img src={mediaUrl(g.opponent_team.logo_url)} alt="" className="h-12 w-12 rounded object-contain bg-secondary p-1" />
                    ) : <div className="h-12 w-12 rounded bg-secondary flex items-center justify-center font-display">?</div>}
                    <div>
                      <div className="font-display text-lg">{g.is_home ? "vs" : "@"} {g.opponent_team?.name ?? "Opponent"}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(g.game_date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                        {g.location ? ` · ${g.location}` : ""}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-[10px] font-display tracking-widest px-2 py-1 rounded ${
                      g.status === "live" ? "bg-primary/20 text-primary animate-pulse" : g.status === "final" ? "bg-secondary text-foreground" : "bg-muted text-muted-foreground"
                    }`}>{g.status?.toUpperCase()}</span>
                    <div className="scoreboard text-2xl font-bold w-20 text-right">{g.home_score}–{g.away_score}</div>
                  </div>
                </Card>
              );
              // Football has in-depth game pages; other sports just show summary cards for now.
              return sport === "football" ? (
                <Link key={g.id} to="/games/$gameId" params={{ gameId: g.id }}>{card}</Link>
              ) : (
                <div key={g.id}>{card}</div>
              );
            })}
          </div>
        ) : (
          <Card className="p-8 text-center border-dashed text-muted-foreground">
            No {meta?.label.toLowerCase()} games yet — staff can add them from the admin panel.
          </Card>
        )}
      </section>

      <section>
        <SectionHeading title="Season Stats Leaders" />
        {stats.isLoading && <p className="text-muted-foreground">Loading…</p>}
        {stats.data && stats.data.leaders.length > 0 ? (
          <Card className="overflow-hidden">
            <div className="px-4 py-2 border-b border-border flex items-center justify-between bg-secondary/40">
              <div className="text-xs font-display tracking-widest text-muted-foreground">PLAYER</div>
              <div className="text-xs font-display tracking-widest text-primary uppercase">{stats.data.leaders[0].key.replace(/_/g, " ")}</div>
            </div>
            <ul className="divide-y divide-border">
              {stats.data.leaders.map((l, i) => (
                <li key={l.name} className="flex items-center justify-between px-4 py-3 hover:bg-secondary/30 transition">
                  <div className="flex items-center gap-3">
                    <span className="scoreboard text-primary w-6">{i + 1}</span>
                    <span className="font-display">{l.name}</span>
                    <span className="text-xs text-muted-foreground">{l.games} {l.games === 1 ? "game" : "games"}</span>
                  </div>
                  <span className="scoreboard text-lg font-bold">{l.total}</span>
                </li>
              ))}
            </ul>
          </Card>
        ) : (
          <Card className="p-8 text-center border-dashed text-muted-foreground">
            No stats yet — staff can link a Google Sheet to each game in the admin panel to sync stats.
          </Card>
        )}
      </section>

      <section>
        <SectionHeading title="Teams" />
        {teams.data && teams.data.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 animate-stagger">
            {teams.data.map((t) => (
              <Link key={t.id} to="/teams/$teamId" params={{ teamId: t.id }} search={{ sport }}>
                <Card className="p-4 h-full flex flex-col items-center text-center hover:border-primary transition hover-lift">
                  {t.logo_url ? (
                    <img src={mediaUrl(t.logo_url)} alt={t.name} className="h-16 w-16 object-contain" />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center font-display text-2xl text-primary-foreground">{t.name[0]}</div>
                  )}
                  <div className="mt-3 font-display tracking-wide text-sm">{t.name}</div>
                  <div className="mt-1 text-[10px] font-display tracking-widest text-primary">VIEW ROSTER →</div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center border-dashed text-muted-foreground">No teams added yet.</Card>
        )}
      </section>

      <section>
        <SectionHeading title="Sabercat Roster" />
        {players.data && players.data.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-stagger">
            {players.data.map((p) => {
              const inner = (
                <Card className="p-4 flex items-center gap-3 hover:border-primary transition hover-lift">
                  {p.photo_url
                    ? <img src={mediaUrl(p.photo_url)} alt="" className="h-14 w-14 rounded object-cover" />
                    : <div className="h-14 w-14 rounded bg-secondary flex items-center justify-center scoreboard font-bold text-primary text-xl">{p.jersey_number ?? "—"}</div>}
                  <div>
                    <div className="font-display text-lg">{p.full_name}</div>
                    <div className="text-xs text-muted-foreground">#{p.jersey_number ?? "—"} {p.position ?? ""} {p.grade ? `· ${p.grade}` : ""}</div>
                  </div>
                </Card>
              );
              return sport === "football"
                ? <Link key={p.id} to="/players/$playerId" params={{ playerId: p.id }}>{inner}</Link>
                : <div key={p.id}>{inner}</div>;
            })}
          </div>
        ) : (
          <Card className="p-8 text-center border-dashed text-muted-foreground">
            No {meta?.label.toLowerCase()} roster yet.
          </Card>
        )}
      </section>
    </div>
  );
}

function SectionHeading({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="h-6 w-1 bg-primary rounded-full" />
      <h2 className="font-display text-2xl tracking-wider">{title}</h2>
    </div>
  );
}
