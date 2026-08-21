// Default stat keys tracked per sport. Games may override via games.stat_template.
export const DEFAULT_STAT_TEMPLATES: Record<string, string[]> = {
  football: [
    "pass_yds", "pass_td", "pass_int", "pass_cmp", "pass_att",
    "rush_yds", "rush_td", "rush_att",
    "rec", "rec_yds", "rec_td",
    "tackles", "sacks", "ints", "ff", "fr",
  ],
  basketball: [
    "pts", "reb", "ast", "stl", "blk",
    "fg_made", "fg_att", "three_made", "three_att", "ft_made", "ft_att", "to",
  ],
  volleyball: ["kills", "assists", "digs", "blocks", "aces", "errors"],
  baseball: ["ab", "h", "r", "rbi", "hr", "bb", "so", "sb"],
};

// Yardage stats use larger increments in the UI.
export const YARDAGE_KEYS = new Set(["pass_yds", "rush_yds", "rec_yds"]);

export function templateForGame(sport: string, override: unknown): string[] {
  if (Array.isArray(override) && override.every((k) => typeof k === "string") && override.length > 0) {
    return override as string[];
  }
  return DEFAULT_STAT_TEMPLATES[sport] ?? [];
}
