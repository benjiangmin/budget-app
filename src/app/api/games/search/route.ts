import { searchGames } from "@/lib/games";
import { MIN_SEARCH_LENGTH } from "@/lib/search-config";

// GET /api/games/search?q=zelda  →  { results: [...], total: 4 }
export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 60);
  if (q.length < MIN_SEARCH_LENGTH) return Response.json({ results: [], total: 0 });
  try {
    return Response.json(await searchGames(q));
  } catch (e) {
    return Response.json({ results: [], error: (e as Error).message }, { status: 500 });
  }
}
