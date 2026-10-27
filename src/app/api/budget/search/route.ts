import { searchEntries } from "@/lib/budget";
import { MIN_SEARCH_LENGTH } from "@/lib/search-config";

// GET /api/search?q=coffee  →  { results: [...] }
// The search bar calls this as you type.
export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 60);
  if (q.length < MIN_SEARCH_LENGTH) return Response.json({ results: [] });

  try {
    const results = await searchEntries(q);
    return Response.json({ results });
  } catch (e) {
    return Response.json({ results: [], error: (e as Error).message }, { status: 500 });
  }
}
