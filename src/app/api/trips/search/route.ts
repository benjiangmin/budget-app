import { searchTrips } from "@/lib/trips";
import { MIN_SEARCH_LENGTH } from "@/lib/search-config";

// GET /api/trips/search?q=zion&scope=trip&trip=<id>  →  { results: [...], total: 4 }
// scope=trip: only that trip. scope=all (or no scope): every trip.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const q = (params.get("q") ?? "").trim().slice(0, 60);
  if (q.length < MIN_SEARCH_LENGTH) return Response.json({ results: [], total: 0 });
  const trip = params.get("scope") === "trip" ? (params.get("trip") ?? undefined) : undefined;
  try {
    return Response.json(await searchTrips(q, trip));
  } catch (e) {
    return Response.json({ results: [], error: (e as Error).message }, { status: 500 });
  }
}
