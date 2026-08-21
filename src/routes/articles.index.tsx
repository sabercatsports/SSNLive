import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { mediaUrl } from "@/lib/media";

export const Route = createFileRoute("/articles/")({
  head: () => ({
    meta: [
      { title: "Articles — SSN Live" },
      { name: "description", content: "Stories, recaps, and features from Sabercat Sports Network." },
      { property: "og:title", content: "SSN Articles" },
      { property: "og:description", content: "Stories and recaps from Sabercat Sports Network." },
    ],
  }),
  component: ArticlesPage,
});

function ArticleCard({ a }: { a: any }) {
  const isExternal = !!a.external_url;
  const content = (
    <Card className="overflow-hidden hover:border-primary transition group h-full flex flex-col hover-lift">
      {a.cover_url ? (
        <img src={mediaUrl(a.cover_url)} alt="" className="aspect-video w-full object-cover transition-transform duration-500 group-hover:scale-105" />
      ) : (
        <div className="aspect-video w-full bg-gradient-to-br from-secondary to-card flex items-center justify-center font-display text-primary/30 text-3xl tracking-widest">
          {isExternal ? "↗" : "SSN"}
        </div>
      )}
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-center gap-2 mb-2">
          {a.category && (
            <div className="text-[10px] uppercase tracking-widest text-primary font-display">{a.category}</div>
          )}
          {isExternal && (
            <div className="text-[10px] uppercase tracking-widest font-display px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
              {a.source ?? "External"} ↗
            </div>
          )}
        </div>
        <h2 className="font-display text-lg leading-tight group-hover:text-primary transition">{a.title}</h2>
        {a.excerpt && <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{a.excerpt}</p>}
        <div className="mt-auto pt-3 text-[11px] text-muted-foreground">
          {a.author_name && <>By {a.author_name} · </>}
          {new Date(a.published_at ?? a.created_at).toLocaleDateString()}
        </div>
      </div>
    </Card>
  );

  return isExternal ? (
    <a href={a.external_url} target="_blank" rel="noreferrer">{content}</a>
  ) : (
    <Link to="/articles/$slug" params={{ slug: a.slug }}>{content}</Link>
  );
}

function ArticlesPage() {
  const { data: articles } = useQuery({
    queryKey: ["articles", "published"],
    queryFn: async () => {
      const { data } = await supabase
        .from("articles")
        .select("*")
        .eq("published", true)
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div className="container mx-auto px-4 py-10 animate-fade-up">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-6 w-1 bg-primary rounded-full" />
        <h1 className="font-display text-4xl tracking-wider">Articles</h1>
      </div>

      {articles && articles.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-stagger">
          {articles.map((a) => <ArticleCard key={a.id} a={a} />)}
        </div>
      ) : (
        <Card className="p-10 text-center border-dashed">
          <div className="font-display text-2xl text-muted-foreground">No articles yet</div>
          <p className="mt-2 text-sm text-muted-foreground">Check back soon — SSN staff are working on the first stories.</p>
        </Card>
      )}
    </div>
  );
}
