import { Suspense } from "react";
import { safeNext } from "@/lib/auth";
import LoginForm from "./LoginForm";

export const metadata = { title: "Locked · benbadobee" };

export default function LoginPage(props: PageProps<"/login">) {
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-sm rounded-card bg-surface p-6 sm:p-8">
        <h1 className="font-display text-2xl font-semibold tracking-tight">benbadobee</h1>
        <p className="mt-1 text-sm text-muted">This place is private.</p>
        <Suspense fallback={<div className="mt-6 h-[8.5rem]" />}>
          {props.searchParams.then((p) => (
            <LoginForm next={safeNext(typeof p.next === "string" ? p.next : "/")} />
          ))}
        </Suspense>
      </div>
    </main>
  );
}
