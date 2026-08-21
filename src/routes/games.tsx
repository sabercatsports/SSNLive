import { createFileRoute, Link } from "@tanstack/react-router";
import { GAME_TEAMS_SELECT, gameMatchup } from "@/lib/game-teams";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "./index";
import { mediaUrl } from "@/lib/media";

export const Route = createFileRoute("/games")({
  head: () => ({
    meta: [
      { title: "Games — SSN" },
      { name: "description", content: "Browse every Sabercat football game with full box scores." },
    ],
  }),
  component: GamesPage,
});

function GamesPage() {
  const { data: games, isLoading } = useQuery({
    queryKey: ["games", "all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("games")
        .select(GAME_TEAMS_SELECT)
        .order("game_date", { ascending: false });
      return data ?? [];
    },
  });

  const grouped = (games ?? []).reduce<Record<string, typeof games>>((acc, g) => {
    const s = g.season ?? "Unknown";
    (acc[s] ||= [] as any).push(g);
    return acc;
  }, {});

  return (
    <div className="container mx-auto px-4 py-10 space-y-10">
      <header>
        <h1 className="font-display text-4xl md:text-5xl">Games</h1>
        <p className="text-muted-foreground mt-2">Every Sabercat game, current season and historical.</p>
      </header>

      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      {!isLoading && (!games || games.length === 0) && (
        <Card className="p-8 text-center text-muted-foreground">No games yet. Staff can add one from the admin panel.</Card>
      )}

      {Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0])).map(([season, list]) => (
        <section key={season}>
          <SectionHeading title={`${season} Season`} />
          <div className="grid gap-3">
            {list?.map((g) => {
              const m = gameMatchup(g);
              return (
              <Link key={g.id} to="/games/$gameId" params={{ gameId: g.id }}>
                <Card className="p-4 flex items-center justify-between hover:border-primary transition">
                  <div className="flex items-center gap-4">
                    {m.home.logo ? (
                      <img src={mediaUrl(m.home.logo)} alt="" className="h-12 w-12 rounded object-contain bg-secondary p-1" />
                    ) : <div className="h-12 w-12 rounded bg-secondary flex items-center justify-center font-display">{m.home.name[0]}</div>}
                    <div>
                      <div className="font-display text-lg">{m.home.name} vs {m.away.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(g.game_date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                        {g.location ? ` · ${g.location}` : ""}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className={`text-[10px] font-display tracking-widest px-2 py-1 rounded ${
                      g.status === "live" ? "bg-primary/20 text-primary" : g.status === "final" ? "bg-secondary text-foreground" : "bg-muted text-muted-foreground"
                    }`}>{g.status.toUpperCase()}</span>
                    <div className="scoreboard text-2xl font-bold w-20 text-right">
                      {g.home_score}–{g.away_score}
                    </div>
                  </div>
                </Card>
              </Link>
            );})}
          </div>
        </section>
      ))}
    </div>
  );
}
