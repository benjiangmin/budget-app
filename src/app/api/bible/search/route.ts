import { searchBible } from "@/lib/bible";
import { MIN_SEARCH_LENGTH } from "@/lib/search-config";

// GET /api/bible/search?q=isaiah&scope=year&year=2023  →  { results: [...], total: 12 }
// scope=year: only that year. scope=all (or no scope): every year.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const q = (params.get("q") ?? "").trim().slice(0, 60);
  if (q.length < MIN_SEARCH_LENGTH) return Response.json({ results: [], total: 0 });
  const year = Number(params.get("year"));
  const only = params.get("scope") === "year" && Number.isInteger(year) && year >= 1900 && year <= 2100 ? year : undefined;
  try {
    return Response.json(await searchBible(q, only));
  } catch (e) {
    return Response.json({ results: [], error: (e as Error).message }, { status: 500 });
  }
}
