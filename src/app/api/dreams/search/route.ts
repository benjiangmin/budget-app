import { searchDreams } from "@/lib/dreams";
import { MIN_SEARCH_LENGTH } from "@/lib/search-config";

// GET /api/dreams/search?q=train  →  { results: [...] }
export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 60);
  if (q.length < MIN_SEARCH_LENGTH) return Response.json({ results: [] });

  try {
    const results = await searchDreams(q);
    return Response.json({ results });
  } catch (e) {
    return Response.json({ results: [], error: (e as Error).message }, { status: 500 });
  }
}
