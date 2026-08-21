import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { inviteStaff } from "@/lib/staff.functions";
import { LiveStatsTracker } from "@/components/admin/LiveStatsTracker";
import { mediaUrl } from "@/lib/media";
import { GAME_TEAMS_SELECT, gameMatchup } from "@/lib/game-teams";
import { fetchPlayersCsv } from "@/lib/players.functions";
import { csvToPlayerRows, type PlayerRow } from "@/lib/csv";


const SPORTS = ["football", "basketball", "volleyball", "baseball"] as const;

function SportSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select className="w-full bg-field text-field-foreground rounded-md border border-border px-3 py-2 text-sm"
      value={value} onChange={(e) => onChange(e.target.value)}>
      {SPORTS.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
    </select>
  );
}

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — SSN" }] }),
  component: AdminPage,
});

function AdminPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const roleQ = useQuery({
    queryKey: ["my-role"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { isAdmin: false, userId: null as string | null };
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      return { isAdmin: (data ?? []).some((r) => r.role === "admin"), userId: user.id };
    },
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (roleQ.isLoading) return <div className="container mx-auto px-4 py-10 text-muted-foreground">Loading…</div>;

  if (!roleQ.data?.isAdmin) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-lg animate-fade-up">
        <Card className="p-8 text-center space-y-4">
          <h1 className="font-display text-2xl">Pending Access</h1>
          <p className="text-sm text-muted-foreground">
            Your account exists but hasn't been granted admin yet. Ask an existing admin to invite you.
          </p>
          <div className="text-xs text-muted-foreground bg-secondary rounded p-3 break-all">
            Your user ID: <span className="text-foreground">{roleQ.data?.userId}</span>
          </div>
          <Button onClick={signOut} variant="outline">Sign out</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10 space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl">Admin</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage content, games, players, and staff.</p>
        </div>
        <Button onClick={signOut} variant="outline">Sign out</Button>
      </div>

      <Tabs defaultValue="live-stats" className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="live-stats">Live Stats</TabsTrigger>
          <TabsTrigger value="articles">Articles</TabsTrigger>
          <TabsTrigger value="instagram">Instagram</TabsTrigger>
          <TabsTrigger value="games">Games</TabsTrigger>
          <TabsTrigger value="players">Players</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="live-stats"><LiveStatsTracker /></TabsContent>
        <TabsContent value="articles"><ArticlesAdmin /></TabsContent>
        <TabsContent value="instagram"><InstagramAdmin /></TabsContent>
        <TabsContent value="games"><GamesAdmin /></TabsContent>
        <TabsContent value="players"><PlayersAdmin /></TabsContent>
        <TabsContent value="teams"><TeamsAdmin /></TabsContent>
        <TabsContent value="staff"><StaffAdmin /></TabsContent>
        <TabsContent value="settings"><SettingsAdmin /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------- Games ---------- */
function GamesAdmin() {
  const qc = useQueryClient();
  const [filterSport, setFilterSport] = useState<string>("football");
  const games = useQuery({
    queryKey: ["admin-games", filterSport],
    queryFn: async () => {
      const { data } = await supabase.from("games")
        .select(GAME_TEAMS_SELECT)
        .eq("sport", filterSport)
        .order("game_date", { ascending: false });
      return data ?? [];
    },
  });
  const teams = useQuery({
    queryKey: ["admin-teams-all"],
    queryFn: async () => (await supabase.from("teams").select("*").order("name")).data ?? [],
  });

  const [form, setForm] = useState({
    sport: "football",
    home_team_id: "",
    away_team_id: "",
    game_date: new Date().toISOString().slice(0, 10),
    location: "",
    status: "scheduled" as "scheduled" | "live" | "final",
    season: new Date().getFullYear().toString(),
  });

  const create = useMutation({
    mutationFn: async () => {
      const all = teams.data ?? [];
      const home = all.find((t) => t.id === form.home_team_id);
      const away = all.find((t) => t.id === form.away_team_id);
      // Legacy fields kept in sync so older views keep working
      const isHome = !!home?.is_home_team || !away?.is_home_team;
      const { error } = await supabase.from("games").insert([{
        ...form,
        is_home: isHome,
        opponent_team_id: isHome ? form.away_team_id : form.home_team_id,
      } as any]);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Game added"); qc.invalidateQueries({ queryKey: ["admin-games"] }); },
    onError: (e: any) => toast.error(e.message),
  });


  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("games").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Game removed"); qc.invalidateQueries({ queryKey: ["admin-games"] }); },
  });

  const update = useMutation({
    mutationFn: async (g: any) => {
      const { error } = await supabase.from("games").update({
        status: g.status, home_score: g.home_score, away_score: g.away_score,
      }).eq("id", g.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["admin-games"] }); },
  });

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card className="p-6 space-y-3">
        <h3 className="font-display text-xl">New Game</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Sport</Label>
            <SportSelect value={form.sport} onChange={(v) => setForm({ ...form, sport: v })} />
          </div>
          <div>
            <Label>Home team</Label>
            <select className="w-full bg-field text-field-foreground rounded-md border border-border px-3 py-2 text-sm"
              value={form.home_team_id} onChange={(e) => setForm({ ...form, home_team_id: e.target.value })}>
              <option value="">— Select —</option>
              {(teams.data ?? []).map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Away team</Label>
            <select className="w-full bg-field text-field-foreground rounded-md border border-border px-3 py-2 text-sm"
              value={form.away_team_id} onChange={(e) => setForm({ ...form, away_team_id: e.target.value })}>
              <option value="">— Select —</option>
              {(teams.data ?? []).filter((t) => t.id !== form.home_team_id).map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Date</Label>
            <Input type="date" value={form.game_date} onChange={(e) => setForm({ ...form, game_date: e.target.value })} />
          </div>

          <div className="col-span-2">
            <Label>Location</Label>
            <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>
          <div className="col-span-2 text-[11px] text-muted-foreground bg-secondary/40 rounded p-2">
            Tip: after creating the game, switch to the <strong>Live Stats</strong> tab to track scores and player stats in real time.
          </div>
        </div>
        <Button disabled={!form.home_team_id || !form.away_team_id || create.isPending} onClick={() => create.mutate()}>
          {create.isPending ? "…" : "Add Game"}
        </Button>
      </Card>

      <Card className="p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl">Existing Games</h3>
          <div className="w-40"><SportSelect value={filterSport} onChange={setFilterSport} /></div>
        </div>
        <div className="space-y-2 max-h-[600px] overflow-auto">
          {(games.data ?? []).map((g: any) => (
            <details key={g.id} className="border border-border rounded p-3">
              <summary className="cursor-pointer flex items-center justify-between gap-2">
                <span className="font-display">{g.game_date} · {gameMatchup(g).label}</span>
                <span className="text-xs text-muted-foreground">{g.status} · {g.home_score}-{g.away_score}</span>
              </summary>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div><Label>Home</Label><Input type="number" defaultValue={g.home_score ?? 0} onBlur={(e) => g.home_score = Number(e.target.value)} /></div>
                <div><Label>Away</Label><Input type="number" defaultValue={g.away_score ?? 0} onBlur={(e) => g.away_score = Number(e.target.value)} /></div>
                <div className="col-span-2">
                  <Label>Status</Label>
                  <select className="w-full bg-field rounded-md border border-border px-3 py-2 text-sm"
                    defaultValue={g.status} onChange={(e) => g.status = e.target.value}>
                    <option value="scheduled">Scheduled</option>
                    <option value="live">Live</option>
                    <option value="final">Final</option>
                  </select>
                </div>
                <div className="col-span-2 flex gap-2">
                  <Button size="sm" onClick={() => update.mutate(g)}>Save</Button>
                  <Button size="sm" variant="destructive" onClick={() => { if (confirm("Delete this game?")) del.mutate(g.id); }}>Delete</Button>
                </div>
              </div>
            </details>
          ))}
          {(games.data ?? []).length === 0 && <div className="text-sm text-muted-foreground text-center py-6">No games for this sport yet.</div>}
        </div>
      </Card>
    </div>
  );
}

/* ---------- Players ---------- */
function PlayersAdmin() {
  const qc = useQueryClient();
  const [filterSport, setFilterSport] = useState<string>("football");
  const players = useQuery({
    queryKey: ["admin-players", filterSport],
    queryFn: async () => (await supabase.from("players").select("*").eq("sport", filterSport).order("jersey_number")).data ?? [],
  });
  const [form, setForm] = useState({ sport: "football", team_id: "", full_name: "", jersey_number: "", position: "", grade: "", height: "", weight: "" });
  const [photo, setPhoto] = useState<File | null>(null);
  const teamOptions = useQuery({
    queryKey: ["admin-teams-all"],
    queryFn: async () => (await supabase.from("teams").select("*").order("name")).data ?? [],
  });

  const create = useMutation({
    mutationFn: async () => {
      let photo_url: string | null = null;
      if (photo) {
        const path = `players/${Date.now()}-${photo.name}`;
        const up = await supabase.storage.from("media").upload(path, photo);
        if (up.error) throw up.error;
        photo_url = supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
      }
      const { error } = await supabase.from("players").insert([{
        sport: form.sport,
        team_id: form.team_id || null,
        full_name: form.full_name,
        jersey_number: form.jersey_number ? Number(form.jersey_number) : null,
        position: form.position || null, grade: form.grade || null,
        height: form.height || null, weight: form.weight || null,
        photo_url,
      } as any]);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Player added"); setForm({ sport: form.sport, team_id: form.team_id, full_name: "", jersey_number: "", position: "", grade: "", height: "", weight: "" }); setPhoto(null); qc.invalidateQueries({ queryKey: ["admin-players"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("players").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Removed"); qc.invalidateQueries({ queryKey: ["admin-players"] }); },
  });

  return (
    <div className="space-y-6">
    <ImportPlayersCard teams={teamOptions.data ?? []} onDone={() => qc.invalidateQueries({ queryKey: ["admin-players"] })} />
    <div className="grid lg:grid-cols-2 gap-6">
      <Card className="p-6 space-y-3">
        <h3 className="font-display text-xl">Add Player</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Label>Sport</Label><SportSelect value={form.sport} onChange={(v) => setForm({ ...form, sport: v })} /></div>
          <div className="col-span-2">
            <Label>Team</Label>
            <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={form.team_id} onChange={(e) => setForm({ ...form, team_id: e.target.value })}>
              <option value="">— No team —</option>
              {(teamOptions.data ?? []).map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
            </select>
          </div>
          <div className="col-span-2"><Label>Full name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
          <div><Label>Jersey #</Label><Input type="number" value={form.jersey_number} onChange={(e) => setForm({ ...form, jersey_number: e.target.value })} /></div>
          <div><Label>Position</Label><Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} /></div>
          <div><Label>Grade</Label><Input value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} /></div>
          <div><Label>Height</Label><Input value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })} /></div>
          <div><Label>Weight</Label><Input value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} /></div>
          <div className="col-span-2"><Label>Photo (optional)</Label><Input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} /></div>
        </div>
        <Button disabled={!form.full_name || create.isPending} onClick={() => create.mutate()}>
          {create.isPending ? "…" : "Add"}
        </Button>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-xl">Roster</h3>
          <div className="w-40"><SportSelect value={filterSport} onChange={setFilterSport} /></div>
        </div>
        <div className="space-y-2 max-h-[600px] overflow-auto">
          {(players.data ?? []).map((p) => (
            <div key={p.id} className="flex items-center justify-between border border-border rounded p-2">
              <div className="flex items-center gap-3">
                {p.photo_url ? <img src={mediaUrl(p.photo_url)} className="h-10 w-10 rounded object-cover" alt="" />
                  : <div className="h-10 w-10 rounded bg-secondary flex items-center justify-center scoreboard font-bold text-primary">{p.jersey_number}</div>}
                <div>
                  <div className="font-display">{p.full_name}</div>
                  <div className="text-xs text-muted-foreground">#{p.jersey_number} {p.position}</div>
                </div>
              </div>
              <Button size="sm" variant="destructive" onClick={() => { if (confirm("Remove " + p.full_name + "?")) del.mutate(p.id); }}>Remove</Button>
            </div>
          ))}
          {(players.data ?? []).length === 0 && <div className="text-sm text-muted-foreground text-center py-6">No players for this sport yet.</div>}
        </div>
      </Card>
    </div>
    </div>
  );
}

/* ---------- Spreadsheet Import ---------- */
function ImportPlayersCard({ teams, onDone }: { teams: Array<{ id: string; name: string }>; onDone: () => void }) {
  const loadCsv = useServerFn(fetchPlayersCsv);
  const [url, setUrl] = useState("");
  const [sport, setSport] = useState<string>("football");
  const [teamId, setTeamId] = useState("");
  const [rows, setRows] = useState<PlayerRow[] | null>(null);
  const [loading, setLoading] = useState(false);

  const preview = async () => {
    setLoading(true);
    try {
      const { csv } = await loadCsv({ data: { url } });
      const parsed = csvToPlayerRows(csv);
      if (parsed.length === 0) {
        toast.error("No player rows found. The sheet needs a header row with a Name column.");
        setRows(null);
      } else {
        setRows(parsed);
        toast.success(`Found ${parsed.length} players`);
      }
    } catch (e: any) {
      toast.error(e.message ?? "Failed to load sheet");
      setRows(null);
    } finally {
      setLoading(false);
    }
  };

  const fileImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = csvToPlayerRows(String(reader.result ?? ""));
      if (parsed.length === 0) toast.error("No player rows found in that file.");
      else { setRows(parsed); toast.success(`Found ${parsed.length} players`); }
    };
    reader.readAsText(file);
  };

  const importRows = useMutation({
    mutationFn: async () => {
      const list = rows ?? [];
      if (list.length === 0) return { added: 0, updated: 0 };
      const { data: existing, error: fetchErr } = await supabase
        .from("players").select("id, full_name").eq("sport", sport);
      if (fetchErr) throw fetchErr;
      const byName = new Map((existing ?? []).map((p) => [p.full_name.trim().toLowerCase(), p.id]));

      let added = 0, updated = 0;
      for (const r of list) {
        const payload = {
          sport,
          team_id: teamId || null,
          full_name: r.full_name,
          jersey_number: r.jersey_number,
          position: r.position,
          grade: r.grade,
          height: r.height,
          weight: r.weight,
        } as any;
        const id = byName.get(r.full_name.trim().toLowerCase());
        const { error } = id
          ? await supabase.from("players").update(payload).eq("id", id)
          : await supabase.from("players").insert([payload]);
        if (error) throw error;
        if (id) updated++; else added++;
      }
      return { added, updated };
    },
    onSuccess: ({ added, updated }) => {
      toast.success(`Import complete: ${added} added, ${updated} updated`);
      setRows(null);
      onDone();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card className="p-6 space-y-3">
      <h3 className="font-display text-xl">Import Players from Spreadsheet</h3>
      <p className="text-xs text-muted-foreground">
        Paste a Google Sheets <span className="text-foreground">File → Share → Publish to web → CSV</span> link, or upload a CSV file.
        Expected columns: <span className="text-foreground">Name, Jersey #, Position, Grade, Height, Weight</span> (extra columns are ignored).
        Players already on the roster (matched by name within the sport) are updated instead of duplicated.
      </p>
      <div className="grid md:grid-cols-4 gap-3">
        <div className="md:col-span-2">
          <Label>Sheet CSV URL</Label>
          <Input placeholder="https://docs.google.com/spreadsheets/d/e/.../pub?output=csv" value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>
        <div><Label>Sport</Label><SportSelect value={sport} onChange={setSport} /></div>
        <div>
          <Label>Team</Label>
          <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={teamId} onChange={(e) => setTeamId(e.target.value)}>
            <option value="">— No team —</option>
            {teams.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
          </select>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <Button disabled={!url.trim() || loading} onClick={preview}>
          {loading ? "Loading…" : "Load & Preview"}
        </Button>
        <span className="text-xs text-muted-foreground">or</span>
        <Input type="file" accept=".csv,text/csv" className="max-w-xs" onChange={(e) => { const f = e.target.files?.[0]; if (f) fileImport(f); }} />
      </div>

      {rows && rows.length > 0 && (
        <div className="space-y-3">
          <div className="overflow-x-auto rounded-lg border border-border max-h-72 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary font-display text-xs uppercase tracking-widest sticky top-0">
                <tr>
                  <th className="text-left p-2">Name</th>
                  <th className="text-right p-2">#</th>
                  <th className="text-left p-2">Pos</th>
                  <th className="text-left p-2">Grade</th>
                  <th className="text-left p-2">Ht</th>
                  <th className="text-left p-2">Wt</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="p-2">{r.full_name}</td>
                    <td className="text-right p-2 scoreboard">{r.jersey_number ?? ""}</td>
                    <td className="p-2">{r.position ?? ""}</td>
                    <td className="p-2">{r.grade ?? ""}</td>
                    <td className="p-2">{r.height ?? ""}</td>
                    <td className="p-2">{r.weight ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-3">
            <Button disabled={importRows.isPending} onClick={() => importRows.mutate()}>
              {importRows.isPending ? "Importing…" : `Import ${rows.length} Players`}
            </Button>
            <Button variant="ghost" onClick={() => setRows(null)}>Cancel</Button>
          </div>
        </div>
      )}
    </Card>
  );
}

/* ---------- Teams ---------- */
function TeamsAdmin() {
  const qc = useQueryClient();
  const teams = useQuery({
    queryKey: ["admin-teams-list"],
    queryFn: async () => (await supabase.from("teams").select("*").order("name")).data ?? [],
  });
  const [form, setForm] = useState({ name: "", short_name: "", is_home_team: false });
  const [logo, setLogo] = useState<File | null>(null);

  const create = useMutation({
    mutationFn: async () => {
      let logo_url: string | null = null;
      if (logo) {
        const path = `teams/${Date.now()}-${logo.name}`;
        const up = await supabase.storage.from("media").upload(path, logo);
        if (up.error) throw up.error;
        logo_url = supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
      }
      const { error } = await supabase.from("teams").insert([{ ...form, logo_url } as any]);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Team added"); setForm({ name: "", short_name: "", is_home_team: false }); setLogo(null); qc.invalidateQueries({ queryKey: ["admin-teams-list"] }); qc.invalidateQueries({ queryKey: ["admin-teams-all"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("teams").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Removed"); qc.invalidateQueries({ queryKey: ["admin-teams-list"] }); qc.invalidateQueries({ queryKey: ["admin-teams-all"] }); },
  });

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card className="p-6 space-y-3">
        <h3 className="font-display text-xl">Add Team</h3>
        <p className="text-xs text-muted-foreground">Teams are shared across every sport — add each school once.</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="col-span-2"><Label>Short name (optional)</Label><Input value={form.short_name} onChange={(e) => setForm({ ...form, short_name: e.target.value })} /></div>
          <div className="col-span-2 flex items-center gap-2">
            <input id="ish" type="checkbox" checked={form.is_home_team} onChange={(e) => setForm({ ...form, is_home_team: e.target.checked })} />
            <Label htmlFor="ish">This is our team (Sabercats)</Label>
          </div>
          <div className="col-span-2"><Label>Logo</Label><Input type="file" accept="image/*" onChange={(e) => setLogo(e.target.files?.[0] ?? null)} /></div>
        </div>
        <Button disabled={!form.name || create.isPending} onClick={() => create.mutate()}>
          {create.isPending ? "…" : "Add"}
        </Button>
      </Card>

      <Card className="p-6">
        <h3 className="font-display text-xl mb-3">Teams</h3>
        <div className="space-y-2 max-h-[600px] overflow-auto">
          {(teams.data ?? []).map((t) => (
            <div key={t.id} className="flex items-center justify-between border border-border rounded p-2">
              <div className="flex items-center gap-3">
                {t.logo_url ? <img src={mediaUrl(t.logo_url)} className="h-10 w-10 object-contain" alt="" />
                  : <div className="h-10 w-10 rounded bg-secondary flex items-center justify-center font-display">{t.name[0]}</div>}
                <div>
                  <div className="font-display">{t.name}</div>
                  {t.is_home_team && <div className="text-[10px] text-primary tracking-widest">HOME TEAM</div>}
                </div>
              </div>
              <Button size="sm" variant="destructive" onClick={() => { if (confirm("Remove " + t.name + "?")) del.mutate(t.id); }}>Remove</Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ---------- Articles ---------- */
function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

function ArticlesAdmin() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["admin-articles"],
    queryFn: async () => (await supabase.from("articles").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const [kind, setKind] = useState<"original" | "external">("original");
  const [form, setForm] = useState({
    title: "", slug: "", excerpt: "", body: "",
    author_name: "", category: "", published: false,
    external_url: "", source: "",
  });
  const [cover, setCover] = useState<File | null>(null);

  const create = useMutation({
    mutationFn: async () => {
      let cover_url: string | null = null;
      if (cover) {
        const path = `articles/${Date.now()}-${cover.name}`;
        const up = await supabase.storage.from("media").upload(path, cover);
        if (up.error) throw up.error;
        cover_url = supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
      }
      const slug = form.slug || slugify(form.title);
      const payload: any = {
        title: form.title, slug,
        excerpt: form.excerpt || null,
        body: kind === "external" ? "" : form.body,
        author_name: form.author_name || null,
        category: form.category || null,
        published: form.published,
        published_at: form.published ? new Date().toISOString() : null,
        cover_url,
        external_url: kind === "external" ? form.external_url || null : null,
        source: kind === "external" ? (form.source || "Etched In Stone") : null,
      };
      const { error } = await supabase.from("articles").insert([payload]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Article saved");
      setForm({ title: "", slug: "", excerpt: "", body: "", author_name: "", category: "", published: false, external_url: "", source: "" });
      setCover(null);
      qc.invalidateQueries({ queryKey: ["admin-articles"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const togglePub = useMutation({
    mutationFn: async (a: any) => {
      const { error } = await supabase.from("articles").update({
        published: !a.published,
        published_at: !a.published ? new Date().toISOString() : a.published_at,
      }).eq("id", a.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-articles"] }); },
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("articles").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin-articles"] }); },
  });

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card className="p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl">New Article</h3>
          <div className="inline-flex rounded-md border border-border text-xs overflow-hidden">
            <button type="button" className={`px-3 py-1.5 ${kind === "original" ? "bg-primary text-primary-foreground" : ""}`} onClick={() => setKind("original")}>Original</button>
            <button type="button" className={`px-3 py-1.5 ${kind === "external" ? "bg-primary text-primary-foreground" : ""}`} onClick={() => setKind("external")}>External link</button>
          </div>
        </div>

        <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value, slug: form.slug || slugify(e.target.value) })} /></div>

        {kind === "external" ? (
          <>
            <div>
              <Label>Article URL (e.g. https://etchedinstone.org/...)</Label>
              <Input value={form.external_url} onChange={(e) => setForm({ ...form, external_url: e.target.value })} placeholder="https://etchedinstone.org/..." />
            </div>
            <div>
              <Label>Source label</Label>
              <Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="Etched In Stone" />
            </div>
          </>
        ) : (
          <div><Label>Slug (URL)</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} placeholder="auto-from-title" /></div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div><Label>Author</Label><Input value={form.author_name} onChange={(e) => setForm({ ...form, author_name: e.target.value })} /></div>
          <div><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Football, Recap…" /></div>
        </div>
        <div><Label>Excerpt</Label><Textarea rows={2} value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} /></div>

        {kind === "original" && (
          <div><Label>Body</Label><Textarea rows={10} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Write the article…" /></div>
        )}

        <div><Label>Cover image (optional)</Label><Input type="file" accept="image/*" onChange={(e) => setCover(e.target.files?.[0] ?? null)} /></div>
        <div className="flex items-center gap-2">
          <input id="pub" type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} />
          <Label htmlFor="pub">Publish immediately</Label>
        </div>
        <Button disabled={!form.title || (kind === "external" && !form.external_url) || create.isPending} onClick={() => create.mutate()}>
          {create.isPending ? "…" : "Save Article"}
        </Button>
      </Card>

      <Card className="p-6">
        <h3 className="font-display text-xl mb-3">All Articles</h3>
        <div className="space-y-2 max-h-[700px] overflow-auto">
          {(list.data ?? []).map((a: any) => (
            <div key={a.id} className="flex items-center justify-between border border-border rounded p-2 gap-2">
              <div className="flex items-center gap-3 min-w-0">
                {a.cover_url ? <img src={mediaUrl(a.cover_url)} className="h-10 w-14 rounded object-cover" alt="" /> : <div className="h-10 w-14 rounded bg-secondary" />}
                <div className="min-w-0">
                  <div className="font-display truncate">{a.title} {a.external_url && <span className="text-[10px] text-primary">↗</span>}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {a.external_url ? (a.source ?? "External") : `/${a.slug}`} {a.published ? "· published" : "· draft"}
                  </div>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="sm" variant="outline" onClick={() => togglePub.mutate(a)}>{a.published ? "Unpublish" : "Publish"}</Button>
                <Button size="sm" variant="destructive" onClick={() => { if (confirm("Delete?")) del.mutate(a.id); }}>×</Button>
              </div>
            </div>
          ))}
          {(list.data ?? []).length === 0 && <div className="text-sm text-muted-foreground text-center py-6">No articles yet.</div>}
        </div>
      </Card>
    </div>
  );
}

/* ---------- Instagram ---------- */
function InstagramAdmin() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["admin-instagram"],
    queryFn: async () => (await supabase.from("instagram_posts").select("*").order("sort_order").order("created_at", { ascending: false })).data ?? [],
  });
  const [form, setForm] = useState({ post_url: "", caption: "", sort_order: 0 });
  const [thumb, setThumb] = useState<File | null>(null);

  const create = useMutation({
    mutationFn: async () => {
      let thumbnail_url: string | null = null;
      if (thumb) {
        const path = `instagram/${Date.now()}-${thumb.name}`;
        const up = await supabase.storage.from("media").upload(path, thumb);
        if (up.error) throw up.error;
        thumbnail_url = supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
      }
      const { error } = await supabase.from("instagram_posts").insert([{ ...form, thumbnail_url } as any]);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Post added"); setForm({ post_url: "", caption: "", sort_order: 0 }); setThumb(null); qc.invalidateQueries({ queryKey: ["admin-instagram"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("instagram_posts").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-instagram"] }); },
  });

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card className="p-6 space-y-3">
        <h3 className="font-display text-xl">Add Instagram Post</h3>
        <div><Label>Instagram post URL</Label><Input value={form.post_url} onChange={(e) => setForm({ ...form, post_url: e.target.value })} placeholder="https://www.instagram.com/p/..." /></div>
        <div><Label>Caption (optional)</Label><Textarea rows={2} value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} /></div>
        <div><Label>Thumbnail image</Label><Input type="file" accept="image/*" onChange={(e) => setThumb(e.target.files?.[0] ?? null)} /></div>
        <div><Label>Sort order (lower = first)</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></div>
        <Button disabled={!form.post_url || create.isPending} onClick={() => create.mutate()}>{create.isPending ? "…" : "Add"}</Button>
      </Card>

      <Card className="p-6">
        <h3 className="font-display text-xl mb-3">Highlights</h3>
        <div className="grid grid-cols-2 gap-2 max-h-[700px] overflow-auto">
          {(list.data ?? []).map((p) => (
            <div key={p.id} className="border border-border rounded overflow-hidden">
              {p.thumbnail_url ? <img src={mediaUrl(p.thumbnail_url)} className="aspect-square w-full object-cover" alt="" /> : <div className="aspect-square bg-secondary" />}
              <div className="p-2 flex items-center justify-between text-xs">
                <a href={p.post_url} target="_blank" rel="noreferrer" className="text-primary truncate">View ↗</a>
                <Button size="sm" variant="destructive" onClick={() => { if (confirm("Delete?")) del.mutate(p.id); }}>×</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ---------- Staff (invite-only) ---------- */
function StaffAdmin() {
  const invite = useServerFn(inviteStaff);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!email) return;
    setBusy(true);
    try {
      const redirectTo = `${window.location.origin}/auth`;
      const res = await invite({ data: { email, redirectTo } });
      toast.success(`Invite sent to ${res.email}`);
      setEmail("");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not send invite");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-6 space-y-4 max-w-xl">
      <h3 className="font-display text-xl">Invite Staff</h3>
      <p className="text-sm text-muted-foreground">
        Send an email invite. The recipient gets a one-click link that lets them set their password and immediately gain admin access to this dashboard.
      </p>
      <div>
        <Label>Staff email</Label>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="coach@example.com" />
      </div>
      <Button disabled={!email || busy} onClick={send}>
        {busy ? "Sending…" : "Send Invite"}
      </Button>
      <p className="text-[11px] text-muted-foreground border-t border-border pt-3">
        Heads-up: invites use the built-in mailer with a low default rate limit. If an invite doesn't arrive, wait a minute and try again — and check spam.
      </p>
    </Card>
  );
}

/* ---------- Settings ---------- */
function SettingsAdmin() {
  const qc = useQueryClient();
  const s = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => (await supabase.from("site_settings").select("*").eq("id", true).maybeSingle()).data,
  });
  const [form, setForm] = useState({ youtube_handle: "", instagram_handle: "", tagline: "" });
  const [loaded, setLoaded] = useState(false);
  if (s.data && !loaded) {
    setForm({
      youtube_handle: s.data.youtube_handle ?? "",
      instagram_handle: s.data.instagram_handle ?? "",
      tagline: s.data.tagline ?? "",
    });
    setLoaded(true);
  }
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("site_settings").update({
        youtube_handle: form.youtube_handle || null,
        instagram_handle: form.instagram_handle || null,
        tagline: form.tagline || null,
        youtube_channel_id: null,
      }).eq("id", true);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Settings saved"); qc.invalidateQueries({ queryKey: ["admin-settings"] }); qc.invalidateQueries({ queryKey: ["youtube-feed"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card className="p-6 space-y-4 max-w-2xl">
      <h3 className="font-display text-xl">Network Settings</h3>
      <div><Label>YouTube handle (without @)</Label><Input value={form.youtube_handle} onChange={(e) => setForm({ ...form, youtube_handle: e.target.value })} placeholder="sabercatsports3774" /></div>
      <div><Label>Instagram handle (without @)</Label><Input value={form.instagram_handle} onChange={(e) => setForm({ ...form, instagram_handle: e.target.value })} placeholder="sabercatsports" /></div>
      <div><Label>Tagline (optional)</Label><Input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} /></div>
      <Button disabled={save.isPending} onClick={() => save.mutate()}>{save.isPending ? "…" : "Save"}</Button>
      <div className="text-xs text-muted-foreground border-t border-border pt-4 space-y-2">
        <div className="font-display text-foreground">Live YouTube detection</div>
        <p>To auto-detect when SSN goes live on YouTube (and pull recent videos), add a <code>YOUTUBE_API_KEY</code> backend secret. Get one free from <a className="text-primary" href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer">Google Cloud Console ↗</a> → enable "YouTube Data API v3" → create an API key. Without it, the Watch page still shows your channel embed.</p>
      </div>
    </Card>
  );
}
