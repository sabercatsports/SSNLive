import { createFileRoute, Link } from "@tanstack/react-router";
import { GAME_TEAMS_SELECT, gameMatchup } from "@/lib/game-teams";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { labelStat, isNumeric } from "@/lib/stat-format";
import { templateForGame } from "@/lib/stat-templates";
import { mediaUrl } from "@/lib/media";

export const Route = createFileRoute("/games/$gameId")({
  head: () => ({
    meta: [
      { title: `Game — SSN Live` },
      { name: "description", content: `Live box score and player stats.` },
    ],
  }),
  component: GameDetailPage,
});

function GameDetailPage() {
  const { gameId } = Route.useParams();
  const qc = useQueryClient();

  useEffect(() => {
    const ch = supabase
      .channel(`game-${gameId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "player_game_stats", filter: `game_id=eq.${gameId}` },
        () => qc.invalidateQueries({ queryKey: ["game-stats", gameId] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "games", filter: `id=eq.${gameId}` },
        () => qc.invalidateQueries({ queryKey: ["game", gameId] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [gameId, qc]);


  const gameQ = useQuery({
    queryKey: ["game", gameId],
    queryFn: async () => {
      const { data } = await supabase
        .from("games")
        .select(GAME_TEAMS_SELECT)
        .eq("id", gameId).single();
      return data;
    },
    refetchInterval: 10_000,
  });

  const statsQ = useQuery({
    queryKey: ["game-stats", gameId],
    queryFn: async () => {
      const { data } = await supabase
        .from("player_game_stats")
        .select("*, player:players(id, full_name, jersey_number, position)")
        .eq("game_id", gameId)
        .order("jersey_number", { ascending: true, nullsFirst: false });
      return data ?? [];
    },
    refetchInterval: 5_000, // live updates
  });

  if (gameQ.isLoading) return <div className="container mx-auto px-4 py-10 text-muted-foreground">Loading…</div>;
  if (!gameQ.data) return <div className="container mx-auto px-4 py-10">Game not found.</div>;

  const g = gameQ.data;
  const stats = statsQ.data ?? [];

  // Prefer the game's tracked template; fall back to whatever numeric keys exist in the data.
  const templateKeys = templateForGame(g.sport, g.stat_template);
  const presentKeys = new Set<string>();
  stats.forEach((s) => Object.entries((s.stats as object) ?? {}).forEach(([k, v]) => {
    if (isNumeric(v) && v !== 0) presentKeys.add(k);
  }));
  const statColumns = templateKeys.length > 0
    ? templateKeys.filter((k) => presentKeys.has(k))
    : Array.from(presentKeys);

  const visibleStats = stats.filter((s) =>
    statColumns.some((k) => isNumeric((s.stats as any)?.[k]) && (s.stats as any)[k] !== 0),
  );

  return (
    <div className="container mx-auto px-4 py-10 space-y-8">
      <Link to="/games" className="text-sm text-muted-foreground hover:text-primary">← All games</Link>

      {/* Scoreboard */}
      <Card className="p-6 md:p-10 bg-gradient-to-br from-card to-secondary">
        <div className="flex items-center justify-between gap-4">
          <SideBlock
            name={gameMatchup(g).home.short}
            score={g.home_score ?? 0}
            logo={mediaUrl(gameMatchup(g).home.logo)}
          />
          <div className="text-center">
            <div className="font-display text-xs tracking-widest text-muted-foreground">
              {g.status === "live"
                ? <span className="text-primary animate-pulse">● LIVE</span>
                : g.status.toUpperCase()}
            </div>
            <div className="font-display text-4xl text-muted-foreground my-2">VS</div>
            <div className="text-xs text-muted-foreground">
              {new Date(g.game_date).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </div>
            {g.location && <div className="text-xs text-muted-foreground">{g.location}</div>}
          </div>
          <SideBlock
            name={gameMatchup(g).away.short}
            score={g.away_score ?? 0}
            logo={mediaUrl(gameMatchup(g).away.logo)}
          />
        </div>
      </Card>


      {/* Stats table */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl">Player Stats</h2>
          {g.status === "live" && <span className="text-xs font-display tracking-widest text-primary animate-pulse">● UPDATING LIVE</span>}
        </div>
        {statColumns.length === 0 ? (
          <Card className="p-6 text-sm text-muted-foreground">
            No stats recorded yet — the coaching staff tracks them live during the game.
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-secondary font-display text-xs uppercase tracking-widest">
                <tr>
                  <th className="text-left p-3">#</th>
                  <th className="text-left p-3">Player</th>
                  {statColumns.map((k) => (
                    <th key={k} className="text-right p-3 whitespace-nowrap">{labelStat(k)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleStats.map((s) => (
                  <tr key={s.id} className="border-t border-border hover:bg-secondary/40 scoreboard">
                    <td className="p-3 text-primary font-bold">{s.jersey_number ?? ""}</td>
                    <td className="p-3">
                      {s.player?.id ? (
                        <Link to="/players/$playerId" params={{ playerId: s.player.id }} className="hover:text-primary">
                          {s.player_name}
                        </Link>
                      ) : s.player_name}
                    </td>
                    {statColumns.map((k) => {
                      const v = (s.stats as any)?.[k];
                      return <td key={k} className="text-right p-3">{isNumeric(v) && v !== 0 ? v : ""}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function SideBlock({ name, score, logo }: { name: string; score: number; logo?: string | null }) {
  return (
    <div className="flex-1 flex flex-col items-center">
      {logo ? <img src={logo} alt="" className="h-20 w-20 object-contain mb-3" />
       : <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center font-display text-2xl text-primary-foreground mb-3">{name[0]}</div>}
      <div className="font-display tracking-wide text-center">{name}</div>
      <div className="scoreboard text-6xl md:text-7xl font-bold text-foreground mt-2">{score}</div>
    </div>
  );
}
