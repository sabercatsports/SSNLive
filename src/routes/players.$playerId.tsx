import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { labelStat, sumStats, isNumeric } from "@/lib/stat-format";
import { mediaUrl } from "@/lib/media";

export const Route = createFileRoute("/players/$playerId")({
  head: () => ({ meta: [{ title: "Player — SSN" }] }),
  component: PlayerPage,
});

function PlayerPage() {
  const { playerId } = Route.useParams();
  const { data: player } = useQuery({
    queryKey: ["player", playerId],
    queryFn: async () => {
      const { data } = await supabase.from("players").select("*").eq("id", playerId).single();
      return data;
    },
  });

  const { data: gameStats } = useQuery({
    queryKey: ["player-stats", playerId],
    queryFn: async () => {
      const { data } = await supabase
        .from("player_game_stats")
        .select("*, game:games(id, game_date, opponent_team:teams!games_opponent_team_id_fkey(name, short_name))")
        .eq("player_id", playerId);
      return data ?? [];
    },
  });

  if (!player) return <div className="container mx-auto px-4 py-10 text-muted-foreground">Loading…</div>;

  const career = sumStats((gameStats ?? []) as Array<{ stats: Record<string, unknown> }>);
  const careerKeys = Object.keys(career).sort();

  return (
    <div className="container mx-auto px-4 py-10 space-y-8">
      <Link to="/players" className="text-sm text-muted-foreground hover:text-primary">← Roster</Link>

      <Card className="p-6 md:p-10 flex flex-col md:flex-row items-center gap-8 bg-gradient-to-br from-card to-secondary">
        {player.photo_url ? (
          <img src={mediaUrl(player.photo_url)} alt={player.full_name} className="h-40 w-40 rounded-xl object-cover" />
        ) : (
          <div className="h-40 w-40 rounded-xl bg-secondary flex items-center justify-center font-display text-7xl text-primary">
            {player.jersey_number ?? "?"}
          </div>
        )}
        <div className="text-center md:text-left">
          <div className="scoreboard text-6xl md:text-7xl font-bold text-primary">#{player.jersey_number ?? "—"}</div>
          <h1 className="font-display text-3xl md:text-5xl mt-2">{player.full_name}</h1>
          <div className="mt-2 text-muted-foreground font-display tracking-widest text-sm">
            {[player.position, player.grade, player.height, player.weight].filter(Boolean).join(" · ")}
          </div>
        </div>
      </Card>

      <section>
        <h2 className="font-display text-2xl mb-4">Career Totals</h2>
        {careerKeys.length === 0 ? (
          <Card className="p-6 text-sm text-muted-foreground">No stats yet.</Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {careerKeys.map((k) => (
              <Card key={k} className="p-4 text-center">
                <div className="scoreboard text-3xl font-bold text-primary">{career[k]}</div>
                <div className="text-[10px] mt-1 uppercase tracking-widest text-muted-foreground font-display">{labelStat(k)}</div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display text-2xl mb-4">Game Log</h2>
        {(!gameStats || gameStats.length === 0) ? (
          <Card className="p-6 text-sm text-muted-foreground">No games yet.</Card>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-secondary font-display text-xs uppercase tracking-widest">
                <tr>
                  <th className="text-left p-3">Date</th>
                  <th className="text-left p-3">Opponent</th>
                  {careerKeys.map((k) => <th key={k} className="text-right p-3 whitespace-nowrap">{labelStat(k)}</th>)}
                </tr>
              </thead>
              <tbody>
                {gameStats.sort((a, b) => (b.game?.game_date ?? "").localeCompare(a.game?.game_date ?? "")).map((s) => (
                  <tr key={s.id} className="border-t border-border scoreboard">
                    <td className="p-3">{s.game?.game_date ? new Date(s.game.game_date).toLocaleDateString() : ""}</td>
                    <td className="p-3">
                      {s.game?.id ? (
                        <Link to="/games/$gameId" params={{ gameId: s.game.id }} className="hover:text-primary">
                          {s.game.opponent_team?.short_name ?? s.game.opponent_team?.name ?? "—"}
                        </Link>
                      ) : "—"}
                    </td>
                    {careerKeys.map((k) => {
                      const v = (s.stats as any)?.[k];
                      return <td key={k} className="text-right p-3">{isNumeric(v) ? v : ""}</td>;
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
