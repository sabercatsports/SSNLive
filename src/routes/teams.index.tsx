import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { mediaUrl } from "@/lib/media";

export const Route = createFileRoute("/teams/")({
  head: () => ({ meta: [{ title: "Teams — SSN" }] }),
  component: TeamsPage,
});

function TeamsPage() {
  const { data: teams } = useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const { data } = await supabase.from("teams").select("*").order("name");
      return data ?? [];
    },
  });

  return (
    <div className="container mx-auto px-4 py-10 space-y-8">
      <header>
        <h1 className="font-display text-4xl md:text-5xl">Teams</h1>
        <p className="text-muted-foreground mt-2">Our team and every opponent on the schedule.</p>
      </header>

      {(!teams || teams.length === 0) ? (
        <Card className="p-8 text-center text-muted-foreground">No teams added yet.</Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {teams.map((t) => (
            <Link key={t.id} to="/teams/$teamId" params={{ teamId: t.id }} className="block"><Card className="p-5 flex flex-col items-center text-center hover:border-primary transition h-full">
              {t.logo_url ? (
                <img src={mediaUrl(t.logo_url)} alt={t.name} className="h-24 w-24 object-contain" />
              ) : (
                <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center font-display text-3xl text-primary-foreground">
                  {t.name[0]}
                </div>
              )}
              <div className="mt-3 font-display tracking-wide">{t.name}</div>
              {t.is_home_team && <div className="text-[10px] mt-1 px-2 py-0.5 rounded-full bg-primary/20 text-primary font-display tracking-widest">HOME</div>}
            </Card></Link>
          ))}
        </div>
      )}
    </div>
  );
}
