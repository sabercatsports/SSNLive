import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { mediaUrl } from "@/lib/media";

export const Route = createFileRoute("/players")({
  head: () => ({
    meta: [
      { title: "Roster — SSN" },
      { name: "description", content: "Sabercat football roster." },
    ],
  }),
  component: PlayersPage,
});

function PlayersPage() {
  const { data: players } = useQuery({
    queryKey: ["players"],
    queryFn: async () => {
      const { data } = await supabase.from("players").select("*").order("jersey_number");
      return data ?? [];
    },
  });

  return (
    <div className="container mx-auto px-4 py-10 space-y-8">
      <header>
        <h1 className="font-display text-4xl md:text-5xl">Roster</h1>
        <p className="text-muted-foreground mt-2">Click any player for career stats.</p>
      </header>

      {(!players || players.length === 0) ? (
        <Card className="p-8 text-center text-muted-foreground">No players yet.</Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {players.map((p) => (
            <Link key={p.id} to="/players/$playerId" params={{ playerId: p.id }}>
              <Card className="overflow-hidden hover:border-primary transition group">
                <div className="aspect-square bg-gradient-to-br from-secondary to-card relative">
                  {p.photo_url ? (
                    <img src={mediaUrl(p.photo_url)} alt={p.full_name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center font-display text-7xl text-muted-foreground/40">
                      {p.jersey_number ?? "?"}
                    </div>
                  )}
                  <div className="absolute top-2 left-2 scoreboard font-bold text-2xl text-primary bg-background/80 backdrop-blur rounded px-2 py-1">
                    #{p.jersey_number ?? "—"}
                  </div>
                </div>
                <div className="p-3">
                  <div className="font-display tracking-wide truncate group-hover:text-primary">{p.full_name}</div>
                  <div className="text-xs text-muted-foreground">{p.position ?? ""} {p.grade ? `· ${p.grade}` : ""}</div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
