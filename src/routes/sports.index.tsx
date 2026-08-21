import { createFileRoute, Link } from "@tanstack/react-router";

const SPORTS = [
  { slug: "football",   label: "Football",   emoji: "🏈", desc: "Live stats, rosters, and the full game archive." },
  { slug: "basketball", label: "Basketball", emoji: "🏀", desc: "Schedules, scores, and player stats — coming this season." },
  { slug: "volleyball", label: "Volleyball", emoji: "🏐", desc: "Match schedules and team rosters." },
  { slug: "baseball",   label: "Baseball",   emoji: "⚾", desc: "Box scores and rosters from the diamond." },
];

export const Route = createFileRoute("/sports/")({
  head: () => ({
    meta: [
      { title: "Sports — SSN Live" },
      { name: "description", content: "Football, basketball, volleyball, and baseball coverage from Sabercat Sports Network." },
      { property: "og:title", content: "SSN Sports" },
    ],
  }),
  component: SportsHub,
});

function SportsHub() {
  return (
    <div className="container mx-auto px-4 py-10 animate-fade-up">
      <header className="mb-8">
        <h1 className="font-display text-4xl md:text-5xl">Sports</h1>
        <p className="text-muted-foreground mt-2">Pick a sport for schedules, rosters, and stats.</p>
      </header>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 animate-stagger">
        {SPORTS.map((s) => (
          <Link key={s.slug} to="/sports/$sport" params={{ sport: s.slug }}>
            <div className="hover-lift relative overflow-hidden rounded-xl border border-border bg-card p-6 h-full hover:border-primary transition group">
              <div className="text-5xl mb-3 transition-transform group-hover:scale-110">{s.emoji}</div>
              <h2 className="font-display text-2xl tracking-wider group-hover:text-primary transition">{s.label}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
              <div className="mt-4 text-xs font-display tracking-widest text-primary">View →</div>
              <div className="pointer-events-none absolute -right-8 -bottom-8 h-32 w-32 rounded-full bg-primary/10 blur-2xl opacity-0 group-hover:opacity-100 transition" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
