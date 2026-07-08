-- Supabase exposes the public schema through its API. These tables contain
-- account data or user-owned state, so browser roles should not access them
-- directly unless a future migration adds narrow RLS policies.

DO $$
DECLARE
  app_table text;
  user_data_tables text[] := ARRAY[
    'User',
    'UserProfile',
    'UserLibraryGame',
    'UserGameRating',
    'UserGamePlayCount',
    'GameList',
    'GameListItem',
    'GameSuggestion',
    'GameComment',
    'Review',
    'ActivityEvent',
    'RuleQuestion',
    'RuleAnswer'
  ];
BEGIN
  FOREACH app_table IN ARRAY user_data_tables LOOP
    IF to_regclass(format('public.%I', app_table)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', app_table);
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', app_table);
    END IF;
  END LOOP;
END $$;
