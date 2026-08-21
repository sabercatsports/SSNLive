ALTER TABLE public.players ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS players_team_id_idx ON public.players(team_id);
UPDATE public.players p SET team_id = t.id
FROM public.teams t
WHERE p.team_id IS NULL AND t.is_home_team = true
AND t.id = (SELECT id FROM public.teams WHERE is_home_team = true ORDER BY created_at LIMIT 1);