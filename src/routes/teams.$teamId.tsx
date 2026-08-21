import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { mediaUrl } from "@/lib/media";

const SPORTS = [
  { slug: "all", label: "All sports" },
  { slug: "football", label: "Football" },
  { slug: "basketball", label: "Basketball" },
  { slug: "volleyball", label: "Volleyball" },
  { slug: "baseball", label: "Baseball" },
];

type Search = { sport?: string };

export const Route = createFileRoute("/teams/$teamId")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    sport: typeof search.sport === "string" ? search.sport : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Team Roster — SSN Live" },
      { name: "description", content: "Team roster and player profiles on Sabercat Sports Network." },
      { property: "og:title", content: "Team Roster — SSN Live" },
      { property: "og:description", content: "Team roster and player profiles on Sabercat Sports Network." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TeamDetail,
  errorComponent: ({ error }) => (
    <div className="container mx-auto px-4 py-16 text-center text-muted-foreground">{error.message}</div>
  ),
});

function TeamDetail() {
  const { teamId } = Route.useParams();
  const { sport } = Route.useSearch();
  const activeSport = sport ?? "all";

  const team = useQuery({
    queryKey: ["team", teamId],
    queryFn: async () => (await supabase.from("teams").select("*").eq("id", teamId).maybeSingle()).data,
  });

  const players = useQuery({
    queryKey: ["team-players", teamId, activeSport],
    queryFn: async () => {
      let q = supabase.from("players").select("*").eq("team_id", teamId);
      if (activeSport !== "all") q = q.eq("sport", activeSport);
      const { data } = await q.order("jersey_number", { ascending: true });
      return data ?? [];
    },
  });

  if (team.isLoading) return <div className="container mx-auto px-4 py-16 text-muted-foreground">Loading…</div>;
  if (!team.data) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="font-display text-3xl">Team not found</h1>
        <Link to="/teams" className="mt-4 inline-block text-primary">All teams →</Link>
      </div>
    );
  }

  const t = team.data;

  return (
    <div className="container mx-auto px-4 py-10 space-y-8 animate-fade-up">
      <Link to="/teams" className="text-xs font-display tracking-widest text-muted-foreground hover:text-primary">← All teams</Link>

      <header className="flex items-center gap-5">
        {t.logo_url ? (
          <img src={mediaUrl(t.logo_url)} alt={t.name} className="h-24 w-24 object-contain" />
        ) : (
          <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center font-display text-3xl text-primary-foreground">
            {t.name[0]}
          </div>
        )}
        <div>
          <h1 className="font-display text-4xl md:text-5xl">{t.name}</h1>
          {t.is_home_team && (
            <div className="mt-2 inline-block text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-display tracking-widest">HOME TEAM</div>
          )}
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {SPORTS.map((s) => (
          <Link
            key={s.slug}
            to="/teams/$teamId"
            params={{ teamId }}
            search={{ sport: s.slug === "all" ? undefined : s.slug }}
            className={`rounded-full border px-3 py-1 text-xs font-display tracking-widest transition ${
              activeSport === s.slug ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:border-primary hover:text-primary"
            }`}
          >
            {s.label.toUpperCase()}
          </Link>
        ))}
      </div>

      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="h-6 w-1 bg-primary rounded-full" />
          <h2 className="font-display text-2xl tracking-wider">Roster</h2>
        </div>
        {players.data && players.data.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-stagger">
            {players.data.map((p) => (
              <Link key={p.id} to="/players/$playerId" params={{ playerId: p.id }}>
                <Card className="overflow-hidden hover:border-primary transition group hover-lift h-full">
                  <div className="aspect-square bg-gradient-to-br from-secondary to-card relative">
                    {p.photo_url ? (
                      <img src={mediaUrl(p.photo_url)} alt={p.full_name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center font-display text-6xl text-muted-foreground/40">
                        {p.jersey_number ?? "?"}
                      </div>
                    )}
                    <div className="absolute top-2 left-2 scoreboard font-bold text-xl text-primary bg-background/80 backdrop-blur rounded px-2 py-0.5">
                      #{p.jersey_number ?? "—"}
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="font-display tracking-wide truncate group-hover:text-primary transition">{p.full_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.position ?? ""}{p.grade ? ` · ${p.grade}` : ""}
                    </div>
                    <div className="text-[10px] uppercase tracking-widest text-primary mt-1">{p.sport}</div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center border-dashed text-muted-foreground">
            No players assigned to this team{activeSport !== "all" ? ` for ${activeSport}` : ""} yet — staff can assign players in the admin panel.
          </Card>
        )}
      </section>
    </div>
  );
}
