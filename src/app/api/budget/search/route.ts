import { searchEntries } from "@/lib/budget";
import { MIN_SEARCH_LENGTH } from "@/lib/search-config";

// GET /api/search?q=coffee  →  { results: [...], total: 150 }
// The search bar calls this as you type.
export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 60);
  if (q.length < MIN_SEARCH_LENGTH) return Response.json({ results: [] });

  try {
    return Response.json(await searchEntries(q)); // { results, total }
  } catch (e) {
    return Response.json({ results: [], error: (e as Error).message }, { status: 500 });
  }
}
