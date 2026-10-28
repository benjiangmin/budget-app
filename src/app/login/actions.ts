"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE, fingerprint, safeNext, sameText } from "@/lib/auth";

export type LoginState = { error: string | null };

export async function unlock(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const password = process.env.SITE_PASSWORD;
  const next = safeNext(String(formData.get("next") ?? "/"));
  if (!password) redirect(next); // no password set (only allowed while developing)

  const given = String(formData.get("password") ?? "");
  if (!sameText(given, password)) {
    await new Promise((r) => setTimeout(r, 1000)); // slows down guessing
    return { error: "Wrong password." };
  }

  (await cookies()).set(AUTH_COOKIE, await fingerprint(password), {
    httpOnly: true, // page scripts can't read it
    secure: process.env.NODE_ENV === "production", // https only on the live site
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // stay unlocked on this browser for a year
  });
  redirect(next);
}

export async function lock() {
  (await cookies()).delete(AUTH_COOKIE);
  redirect("/login");
}
