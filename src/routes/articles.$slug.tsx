import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { mediaUrl } from "@/lib/media";

export const Route = createFileRoute("/articles/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} — SSN Live` },
    ],
  }),
  component: ArticlePage,
  notFoundComponent: () => (
    <div className="container mx-auto px-4 py-20 text-center">
      <h1 className="font-display text-3xl">Article not found</h1>
      <Link to="/articles" className="text-primary mt-4 inline-block">Back to articles</Link>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">{error.message}</div>
  ),
});

function ArticlePage() {
  const { slug } = Route.useParams();
  const { data: article, isLoading } = useQuery({
    queryKey: ["article", slug],
    queryFn: async () => {
      const { data } = await supabase.from("articles").select("*").eq("slug", slug).eq("published", true).maybeSingle();
      if (!data) throw notFound();
      return data;
    },
  });

  if (isLoading) return <div className="container mx-auto px-4 py-20 text-muted-foreground">Loading…</div>;
  if (!article) return null;

  return (
    <article className="container mx-auto px-4 py-10 max-w-3xl">
      <Link to="/articles" className="text-xs uppercase tracking-widest text-primary font-display">← Articles</Link>
      {article.category && (
        <div className="mt-4 text-[10px] uppercase tracking-widest text-primary font-display">{article.category}</div>
      )}
      <h1 className="mt-2 font-display text-4xl md:text-5xl tracking-tight">{article.title}</h1>
      <div className="mt-3 text-sm text-muted-foreground">
        {article.author_name && <>By {article.author_name} · </>}
        {new Date(article.published_at ?? article.created_at).toLocaleDateString()}
      </div>
      {article.cover_url && (
        <img src={mediaUrl(article.cover_url)} alt="" className="mt-6 w-full rounded-xl border border-border object-cover aspect-video" />
      )}
      {article.excerpt && <p className="mt-6 text-lg text-muted-foreground italic">{article.excerpt}</p>}
      <div className="mt-6 whitespace-pre-wrap leading-relaxed text-foreground/90">
        {article.body}
      </div>
    </article>
  );
}
