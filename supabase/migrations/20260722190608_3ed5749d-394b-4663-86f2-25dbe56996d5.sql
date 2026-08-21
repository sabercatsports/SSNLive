
-- Per-game stat template override (array of stat keys)
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS stat_template jsonb;

-- Ensure one stats row per (game, player)
CREATE UNIQUE INDEX IF NOT EXISTS player_game_stats_game_player_uniq
  ON public.player_game_stats (game_id, player_id)
  WHERE player_id IS NOT NULL;

-- Atomic stat delta (admin only)
CREATE OR REPLACE FUNCTION public.increment_player_stat(
  _game_id uuid,
  _player_id uuid,
  _key text,
  _delta numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _player_name text;
  _jersey int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT full_name, jersey_number INTO _player_name, _jersey
  FROM public.players WHERE id = _player_id;

  IF _player_name IS NULL THEN RAISE EXCEPTION 'player not found'; END IF;

  INSERT INTO public.player_game_stats (game_id, player_id, player_name, jersey_number, stats)
  VALUES (_game_id, _player_id, _player_name, _jersey,
          jsonb_build_object(_key, _delta))
  ON CONFLICT (game_id, player_id) WHERE player_id IS NOT NULL
  DO UPDATE SET
    stats = jsonb_set(
      COALESCE(public.player_game_stats.stats, '{}'::jsonb),
      ARRAY[_key],
      to_jsonb(
        COALESCE((public.player_game_stats.stats ->> _key)::numeric, 0) + _delta
      )
    ),
    updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_player_stat(uuid, uuid, text, numeric) TO authenticated;

-- Reset a single stat (or delete a player row)
CREATE OR REPLACE FUNCTION public.reset_player_stat(
  _game_id uuid,
  _player_id uuid,
  _key text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  UPDATE public.player_game_stats
  SET stats = stats - _key, updated_at = now()
  WHERE game_id = _game_id AND player_id = _player_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_player_stat(uuid, uuid, text) TO authenticated;
