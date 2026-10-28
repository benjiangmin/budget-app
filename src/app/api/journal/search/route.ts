import { searchJournal } from "@/lib/journal";
import { MIN_SEARCH_LENGTH } from "@/lib/search-config";

// GET /api/journal/search?q=beach&scope=doc&year=2023  →  { results: [...], total: 150 }
// scope=doc: only that document's dates. scope=all (or no scope): every document.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const q = (params.get("q") ?? "").trim().slice(0, 60);
  if (q.length < MIN_SEARCH_LENGTH) return Response.json({ results: [], total: 0 });
  const year = Number(params.get("year"));
  const docYear = params.get("scope") === "doc" && Number.isInteger(year) && year >= 1900 && year <= 2100 ? year : undefined;
  try {
    return Response.json(await searchJournal(q, docYear));
  } catch (e) {
    return Response.json({ results: [], error: (e as Error).message }, { status: 500 });
  }
}
