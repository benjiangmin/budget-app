import "server-only";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;

export function db() {
  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SECRET_KEY. Copy .env.example to .env.local and fill them in.",
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
