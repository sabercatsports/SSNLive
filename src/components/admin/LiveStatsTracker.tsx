import { useMemo, useState } from "react";
import { GAME_TEAMS_SELECT, gameMatchup } from "@/lib/game-teams";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { DEFAULT_STAT_TEMPLATES, YARDAGE_KEYS, templateForGame } from "@/lib/stat-templates";
import { labelStat } from "@/lib/stat-format";

const SPORTS = ["football", "basketball", "volleyball", "baseball"] as const;

export function LiveStatsTracker() {
  const qc = useQueryClient();
  const [sport, setSport] = useState<string>("football");
  const [gameId, setGameId] = useState<string>("");

  const gamesQ = useQuery({
    queryKey: ["tracker-games", sport],
    queryFn: async () => {
      const { data } = await supabase.from("games")
        .select("*, opponent_team:teams!games_opponent_team_id_fkey(name, short_name)")
        .eq("sport", sport)
        .order("game_date", { ascending: false });
      return data ?? [];
    },
  });

  const game = useMemo(
    () => gamesQ.data?.find((g) => g.id === gameId) ?? null,
    [gamesQ.data, gameId],
  );

  const playersQ = useQuery({
    queryKey: ["tracker-players", sport],
    queryFn: async () => (await supabase.from("players").select("id, full_name, jersey_number, position").eq("sport", sport).order("jersey_number")).data ?? [],
  });

  const statsQ = useQuery({
    queryKey: ["tracker-stats", gameId],
    enabled: !!gameId,
    queryFn: async () => (await supabase.from("player_game_stats").select("*").eq("game_id", gameId)).data ?? [],
    refetchInterval: 5000,
  });

  const template = game ? templateForGame(sport, game.stat_template) : [];

  const inc = useMutation({
    mutationFn: async (v: { playerId: string; key: string; delta: number }) => {
      const { error } = await supabase.rpc("increment_player_stat", {
        _game_id: gameId, _player_id: v.playerId, _key: v.key, _delta: v.delta,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tracker-stats", gameId] }),
    onError: (e: any) => toast.error(e.message),
  });

  const resetStat = useMutation({
    mutationFn: async (v: { playerId: string; key: string }) => {
      const { error } = await supabase.rpc("reset_player_stat", {
        _game_id: gameId, _player_id: v.playerId, _key: v.key,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tracker-stats", gameId] }),
  });

  const updateGame = useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      const { error } = await supabase.from("games").update(patch as never).eq("id", gameId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tracker-games", sport] }); qc.invalidateQueries({ queryKey: ["game", gameId] }); },
    onError: (e: any) => toast.error(e.message),
  });

  // Which players are already on the roster/tracking list for this game
  const [addedPlayers, setAddedPlayers] = useState<Set<string>>(new Set());
  const trackedIds = useMemo(() => {
    const ids = new Set<string>();
    (statsQ.data ?? []).forEach((s) => s.player_id && ids.add(s.player_id));
    addedPlayers.forEach((id) => ids.add(id));
    return ids;
  }, [statsQ.data, addedPlayers]);

  const tracked = (playersQ.data ?? []).filter((p) => trackedIds.has(p.id));
  const notTracked = (playersQ.data ?? []).filter((p) => !trackedIds.has(p.id));

  function statValue(playerId: string, key: string): number {
    const row = statsQ.data?.find((r) => r.player_id === playerId);
    const v = (row?.stats as any)?.[key];
    return typeof v === "number" ? v : 0;
  }

  return (
    <div className="space-y-6">
      {/* Game selector + score */}
      <Card className="p-6 space-y-4">
        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <Label>Sport</Label>
            <select className="w-full bg-field rounded-md border border-border px-3 py-2 text-sm"
              value={sport} onChange={(e) => { setSport(e.target.value); setGameId(""); }}>
              {SPORTS.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <Label>Game</Label>
            <select className="w-full bg-field rounded-md border border-border px-3 py-2 text-sm"
              value={gameId} onChange={(e) => setGameId(e.target.value)}>
              <option value="">— Select game —</option>
              {(gamesQ.data ?? []).map((g) => (
                <option key={g.id} value={g.id}>
                  {g.game_date} · {g.is_home ? "vs" : "@"} {g.opponent_team?.name ?? "?"} · {g.status}
                </option>
              ))}
            </select>
          </div>
        </div>

        {game && (
          <div className="grid md:grid-cols-4 gap-3 pt-2 border-t border-border">
            <div>
              <Label>Status</Label>
              <select className="w-full bg-field rounded-md border border-border px-3 py-2 text-sm"
                value={game.status}
                onChange={(e) => updateGame.mutate({ status: e.target.value })}>
                <option value="scheduled">Scheduled</option>
                <option value="live">Live</option>
                <option value="final">Final</option>
              </select>
            </div>
            <div>
              <Label>{game.is_home ? "Sabercats (home)" : "Sabercats (away)"} score</Label>
              <ScoreControl
                value={game.is_home ? game.home_score : game.away_score}
                onChange={(v) => updateGame.mutate(game.is_home ? { home_score: v } : { away_score: v })}
              />
            </div>
            <div>
              <Label>Opponent score</Label>
              <ScoreControl
                value={game.is_home ? game.away_score : game.home_score}
                onChange={(v) => updateGame.mutate(game.is_home ? { away_score: v } : { home_score: v })}
              />
            </div>
            <div className="text-xs text-muted-foreground self-end">
              Score & stats update on the public game page every few seconds.
            </div>
          </div>
        )}
      </Card>

      {!gameId && (
        <Card className="p-8 text-center text-muted-foreground text-sm">
          Pick a game above to start tracking stats.
        </Card>
      )}

      {game && (
        <>
          {/* Template editor */}
          <TemplateEditor
            sport={sport}
            value={template}
            isCustom={Array.isArray(game.stat_template)}
            onSave={(keys) => updateGame.mutate({ stat_template: keys })}
            onReset={() => updateGame.mutate({ stat_template: null })}
          />

          {/* Roster picker */}
          <Card className="p-6 space-y-3">
            <h3 className="font-display text-xl">Add players to tracker</h3>
            {notTracked.length === 0 ? (
              <p className="text-sm text-muted-foreground">All {sport} players are on the tracker.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {notTracked.map((p) => (
                  <Button key={p.id} size="sm" variant="outline"
                    onClick={() => setAddedPlayers((prev) => new Set(prev).add(p.id))}>
                    + #{p.jersey_number ?? "—"} {p.full_name}
                  </Button>
                ))}
              </div>
            )}
          </Card>

          {/* Stat grid */}
          <Card className="p-0 overflow-hidden">
            {tracked.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Add players above to start recording stats.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/60 font-display text-xs uppercase tracking-widest">
                    <tr>
                      <th className="text-left p-3 sticky left-0 bg-secondary/60 z-10">Player</th>
                      {template.map((k) => (
                        <th key={k} className="text-center p-3 whitespace-nowrap">{labelStat(k)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tracked.map((p) => (
                      <tr key={p.id} className="border-t border-border">
                        <td className="p-2 sticky left-0 bg-card z-10 whitespace-nowrap">
                          <div className="scoreboard text-primary font-bold">#{p.jersey_number ?? "—"}</div>
                          <div className="font-display text-sm">{p.full_name}</div>
                        </td>
                        {template.map((k) => {
                          const isYards = YARDAGE_KEYS.has(k);
                          const step = isYards ? 5 : 1;
                          const val = statValue(p.id, k);
                          return (
                            <td key={k} className="p-2 text-center">
                              <div className="inline-flex items-center gap-1">
                                <IconBtn onClick={() => inc.mutate({ playerId: p.id, key: k, delta: -step })} label="−" />
                                <span className="scoreboard font-bold w-10 text-center tabular-nums">{val}</span>
                                <IconBtn onClick={() => inc.mutate({ playerId: p.id, key: k, delta: step })} label="+" primary />
                                {isYards && (
                                  <IconBtn onClick={() => inc.mutate({ playerId: p.id, key: k, delta: 1 })} label="+1" small />
                                )}
                                {val !== 0 && (
                                  <button className="text-[10px] text-muted-foreground hover:text-destructive ml-1"
                                    title="Reset"
                                    onClick={() => resetStat.mutate({ playerId: p.id, key: k })}>×</button>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function IconBtn({ onClick, label, primary, small }: { onClick: () => void; label: string; primary?: boolean; small?: boolean }) {
  const cls = small
    ? "h-6 px-1.5 text-[10px] rounded border border-border hover:border-primary"
    : `h-7 w-7 rounded-md text-sm font-bold ${primary ? "bg-primary text-primary-foreground hover:opacity-90" : "border border-border hover:border-primary"}`;
  return <button type="button" onClick={onClick} className={cls}>{label}</button>;
}

function ScoreControl({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const v = value ?? 0;
  return (
    <div className="flex items-center gap-2">
      <button type="button" className="h-9 w-9 rounded-md border border-border hover:border-primary text-lg font-bold"
        onClick={() => onChange(Math.max(0, v - 1))}>−</button>
      <Input type="number" className="text-center scoreboard font-bold" value={v}
        onChange={(e) => onChange(Number(e.target.value) || 0)} />
      <button type="button" className="h-9 w-9 rounded-md bg-primary text-primary-foreground font-bold text-lg"
        onClick={() => onChange(v + 1)}>+</button>
    </div>
  );
}

function TemplateEditor({
  sport, value, isCustom, onSave, onReset,
}: { sport: string; value: string[]; isCustom: boolean; onSave: (keys: string[]) => void; onReset: () => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string[]>(value);
  const [newKey, setNewKey] = useState("");

  function start() { setDraft(value); setEditing(true); }
  function addKey() {
    const k = newKey.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    if (!k || draft.includes(k)) return;
    setDraft([...draft, k]); setNewKey("");
  }

  return (
    <Card className="p-6 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-display text-xl">Tracked Stats</h3>
          <p className="text-xs text-muted-foreground">
            {isCustom ? "Custom template for this game." : `Default ${sport} template.`}
          </p>
        </div>
        <div className="flex gap-2">
          {!editing && <Button size="sm" variant="outline" onClick={start}>Edit template</Button>}
          {isCustom && !editing && <Button size="sm" variant="ghost" onClick={onReset}>Reset to default</Button>}
        </div>
      </div>

      {!editing ? (
        <div className="flex flex-wrap gap-2">
          {value.map((k) => (
            <span key={k} className="text-xs bg-secondary rounded px-2 py-1 font-display">{labelStat(k)}</span>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {draft.map((k) => (
              <span key={k} className="text-xs bg-secondary rounded px-2 py-1 font-display inline-flex items-center gap-1">
                {labelStat(k)}
                <button className="text-muted-foreground hover:text-destructive"
                  onClick={() => setDraft(draft.filter((x) => x !== k))}>×</button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input placeholder="Add stat key (e.g. blocks)" value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addKey(); } }} />
            <Button variant="outline" onClick={addKey}>Add</Button>
          </div>
          <div className="text-[11px] text-muted-foreground">
            Suggestions: {(DEFAULT_STAT_TEMPLATES[sport] ?? []).filter((k) => !draft.includes(k)).map((k) => (
              <button key={k} className="underline hover:text-primary mr-2" onClick={() => setDraft([...draft, k])}>{labelStat(k)}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => { onSave(draft); setEditing(false); }}>Save template</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </Card>
  );
}
