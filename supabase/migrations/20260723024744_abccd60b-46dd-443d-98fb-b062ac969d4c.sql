ALTER TABLE public.games REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.games;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE public.player_game_stats REPLICA IDENTITY FULL;