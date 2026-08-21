-- Required so signed-in users can read their own row via the existing RLS policy
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- Backfill grants on other public tables in case they were missed
GRANT SELECT ON public.articles, public.games, public.teams, public.players,
                public.player_game_stats, public.instagram_posts, public.site_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.articles, public.games, public.teams, public.players,
                public.player_game_stats, public.instagram_posts, public.site_settings TO authenticated;
GRANT ALL ON public.articles, public.games, public.teams, public.players,
             public.player_game_stats, public.instagram_posts, public.site_settings TO service_role;