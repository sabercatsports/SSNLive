// Stat key → human label
const LABELS: Record<string, string> = {
  pass_yds: "Pass Yds",
  pass_td: "Pass TD",
  pass_int: "INT",
  pass_cmp: "Cmp",
  pass_att: "Att",
  rush_yds: "Rush Yds",
  rush_td: "Rush TD",
  rush_att: "Carries",
  rec: "Rec",
  rec_yds: "Rec Yds",
  rec_td: "Rec TD",
  tackles: "Tackles",
  sacks: "Sacks",
  ints: "INT",
  ff: "FF",
  fr: "FR",
};

export function labelStat(key: string): string {
  if (LABELS[key]) return LABELS[key];
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function isNumeric(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

export function sumStats(rows: Array<{ stats: Record<string, unknown> }>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) {
    for (const [k, v] of Object.entries(r.stats ?? {})) {
      if (isNumeric(v)) out[k] = (out[k] ?? 0) + v;
    }
  }
  return out;
}
