ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS home_team_id uuid REFERENCES public.teams(id),
  ADD COLUMN IF NOT EXISTS away_team_id uuid REFERENCES public.teams(id);

UPDATE public.games g
SET home_team_id = COALESCE(g.home_team_id, CASE WHEN g.is_home THEN (SELECT t.id FROM public.teams t WHERE t.is_home_team ORDER BY t.created_at LIMIT 1) ELSE g.opponent_team_id END),
    away_team_id = COALESCE(g.away_team_id, CASE WHEN g.is_home THEN g.opponent_team_id ELSE (SELECT t.id FROM public.teams t WHERE t.is_home_team ORDER BY t.created_at LIMIT 1) END);

CREATE INDEX IF NOT EXISTS games_home_team_id_idx ON public.games(home_team_id);
CREATE INDEX IF NOT EXISTS games_away_team_id_idx ON public.games(away_team_id);