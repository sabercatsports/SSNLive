
-- Multi-sport support
ALTER TABLE public.teams   ADD COLUMN IF NOT EXISTS sport text NOT NULL DEFAULT 'football';
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS sport text NOT NULL DEFAULT 'football';
ALTER TABLE public.games   ADD COLUMN IF NOT EXISTS sport text NOT NULL DEFAULT 'football';

CREATE INDEX IF NOT EXISTS idx_teams_sport   ON public.teams(sport);
CREATE INDEX IF NOT EXISTS idx_players_sport ON public.players(sport);
CREATE INDEX IF NOT EXISTS idx_games_sport   ON public.games(sport);

-- External / linked articles (e.g. etchedinstone.org)
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS external_url text;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS source text;

-- Bootstrap admin account: markusalexnina@gmail.com
DO $$
DECLARE
  v_uid uuid;
  v_existing uuid;
BEGIN
  SELECT id INTO v_existing FROM auth.users WHERE email = 'markusalexnina@gmail.com';

  IF v_existing IS NULL THEN
    v_uid := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      is_super_admin, confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_uid, 'authenticated', 'authenticated',
      'markusalexnina@gmail.com',
      crypt('9767MnCraft#', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      false, '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_uid,
      jsonb_build_object('sub', v_uid::text, 'email', 'markusalexnina@gmail.com', 'email_verified', true),
      'email', v_uid::text, now(), now(), now());
  ELSE
    v_uid := v_existing;
    UPDATE auth.users
      SET encrypted_password = crypt('9767MnCraft#', gen_salt('bf')),
          email_confirmed_at = COALESCE(email_confirmed_at, now()),
          updated_at = now()
      WHERE id = v_uid;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_uid, 'admin'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;
