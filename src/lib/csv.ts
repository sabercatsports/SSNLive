// Minimal RFC-4180-ish CSV parser: handles quoted fields, escaped quotes, CRLF.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"' && field === "") {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field); field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((v) => v.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((v) => v.trim() !== "")) rows.push(row);
  return rows;
}

const HEADER_ALIASES: Record<string, string[]> = {
  full_name: ["name", "full name", "full_name", "player", "player name", "athlete"],
  jersey_number: ["#", "jersey", "jersey #", "jersey number", "number", "no", "num"],
  position: ["position", "pos"],
  grade: ["grade", "class", "year"],
  height: ["height", "ht"],
  weight: ["weight", "wt", "lbs"],
};

export type PlayerRow = {
  full_name: string;
  jersey_number: number | null;
  position: string | null;
  grade: string | null;
  height: string | null;
  weight: string | null;
};

export function csvToPlayerRows(csv: string): PlayerRow[] {
  const rows = parseCsv(csv);
  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const colFor = (key: keyof typeof HEADER_ALIASES) => {
    for (const alias of HEADER_ALIASES[key]) {
      const idx = headers.indexOf(alias);
      if (idx !== -1) return idx;
      // prefix match, e.g. "jersey #" vs "jersey"
      const pidx = headers.findIndex((h) => h.startsWith(alias));
      if (pidx !== -1) return pidx;
    }
    return -1;
  };

  const idx = {
    full_name: colFor("full_name"),
    jersey_number: colFor("jersey_number"),
    position: colFor("position"),
    grade: colFor("grade"),
    height: colFor("height"),
    weight: colFor("weight"),
  };
  if (idx.full_name === -1) idx.full_name = 0; // fall back to first column

  const out: PlayerRow[] = [];
  for (const row of rows.slice(1)) {
    const get = (i: number) => (i >= 0 ? row[i]?.trim() ?? "" : "");
    const name = get(idx.full_name);
    if (!name) continue;
    const j = get(idx.jersey_number);
    const n = j === "" ? null : Number(j);
    out.push({
      full_name: name,
      jersey_number: n !== null && Number.isFinite(n) ? n : null,
      position: get(idx.position) || null,
      grade: get(idx.grade) || null,
      height: get(idx.height) || null,
      weight: get(idx.weight) || null,
    });
  }
  return out;
}
