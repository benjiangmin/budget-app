import { searchJournal } from "@/lib/journal";
import { MIN_SEARCH_LENGTH } from "@/lib/search-config";

// GET /api/journal/search?q=beach  →  { results: [...] }
export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 60);
  if (q.length < MIN_SEARCH_LENGTH) return Response.json({ results: [] });
  try {
    return Response.json({ results: await searchJournal(q) });
  } catch (e) {
    return Response.json({ results: [], error: (e as Error).message }, { status: 500 });
  }
}
