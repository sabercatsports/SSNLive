import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Thin wrapper — all runtime logic lives inside the handler so nothing
// leaks into the client bundle.
export const fetchPlayersCsv = createServerFn({ method: "POST" })
  .inputValidator(z.object({ url: z.string().url() }))
  .handler(async ({ data }) => {
    const url = data.url.trim();

    const isGoogleSheets = /^https:\/\/docs\.google\.com\/spreadsheets\//.test(url);
    if (!isGoogleSheets && !/^https:\/\//.test(url)) {
      throw new Error("URL must be a public https link (Google Sheets 'Publish to web' CSV link recommended).");
    }

    const res = await fetch(url, { redirect: "follow", headers: { accept: "text/csv,text/plain,*/*" } });
    if (!res.ok) throw new Error(`Could not fetch sheet (${res.status}). Make sure it's published to the web as CSV.`);

    const text = await res.text();
    if (!text.trim()) throw new Error("The sheet returned no data.");
    if (text.trimStart().startsWith("<")) {
      throw new Error("The link returned a webpage, not CSV. In Google Sheets use File → Share → Publish to web → CSV.");
    }
    return { csv: text.slice(0, 500_000) };
  });
