export const GAME_TEAMS_SELECT =
  "*, opponent_team:teams!games_opponent_team_id_fkey(*), home_team:teams!games_home_team_id_fkey(*), away_team:teams!games_away_team_id_fkey(*)";

type TeamLike = { name?: string | null; short_name?: string | null; logo_url?: string | null } | null | undefined;

export type Side = { name: string; short: string; logo: string | null };

function side(t: TeamLike, fallback: string): Side {
  return {
    name: t?.name ?? fallback,
    short: t?.short_name ?? t?.name ?? fallback,
    logo: t?.logo_url ?? null,
  };
}

/** Resolve the two teams of a game, falling back to legacy opponent/is_home rows. */
export function gameMatchup(g: any): { home: Side; away: Side; label: string } {
  const legacyHome = g?.is_home ? null : g?.opponent_team;
  const legacyAway = g?.is_home ? g?.opponent_team : null;

  const home = side(g?.home_team ?? legacyHome, g?.is_home ? "Sabercats" : "Home");
  const away = side(g?.away_team ?? legacyAway, g?.is_home ? "Away" : "Sabercats");

  return { home, away, label: `${home.name} vs ${away.name}` };
}
