"use client";

import { useActionState } from "react";
import { unlock, type LoginState } from "./actions";

export default function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(unlock, { error: null });

  return (
    <form action={action} className="mt-6 flex flex-col gap-3">
      <input type="hidden" name="next" value={next} />
      <input
        type="password"
        name="password"
        required
        autoFocus
        autoComplete="current-password"
        placeholder="Password"
        aria-label="Password"
        style={{ outline: "none" }}
        className="w-full rounded-control border-[1.5px] border-line bg-paper px-4 py-3 text-ink placeholder:text-muted/70 focus:border-ink"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-control bg-accent px-5 py-3 font-semibold text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Checking…" : "Unlock"}
      </button>
      <p role="status" className="min-h-5 text-sm text-danger">
        {state.error}
      </p>
    </form>
  );
}
