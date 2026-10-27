"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

// Our own styled replacement for the browser's confirm() popup.
// Usage:  const confirm = useConfirm();
//         if (await confirm({ title: "Delete this expense?", confirmLabel: "Delete" })) { ... }

type Options = { title: string; body?: string; confirmLabel?: string };
type Ask = (opts: Options) => Promise<boolean>;

const ConfirmContext = createContext<Ask | null>(null);

export function useConfirm(): Ask {
  const ask = useContext(ConfirmContext);
  if (!ask) throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return ask;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<Options | null>(null);
  const resolver = useRef<(ok: boolean) => void>(undefined);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const ask = useCallback<Ask>((o) => {
    setOpts(o);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  // Open the native <dialog> whenever there's a question to ask.
  useEffect(() => {
    if (opts) dialogRef.current?.showModal();
  }, [opts]);

  function answer(ok: boolean) {
    resolver.current?.(ok);
    resolver.current = undefined;
    dialogRef.current?.close();
    setOpts(null);
  }

  return (
    <ConfirmContext.Provider value={ask}>
      {children}
      <dialog
        ref={dialogRef}
        onCancel={(e) => {
          e.preventDefault(); // Escape key
          answer(false);
        }}
        onClick={(e) => {
          if (e.target === dialogRef.current) answer(false); // click on the dimmed backdrop
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-card bg-paper p-0 text-ink shadow-2xl shadow-ink/30 backdrop:bg-ink/40 backdrop:backdrop-blur-[2px]"
      >
        {opts && (
          <div className="p-5">
            <h2 className="font-display text-lg font-semibold">{opts.title}</h2>
            {opts.body && <p className="mt-1.5 text-sm text-muted">{opts.body}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => answer(false)}
                className="rounded-control px-4 py-2 text-muted transition-colors hover:bg-surface hover:text-ink"
              >
                Cancel
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => answer(true)}
                className="rounded-control bg-danger px-4 py-2 font-semibold text-paper transition-opacity hover:opacity-90"
              >
                {opts.confirmLabel ?? "OK"}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </ConfirmContext.Provider>
  );
}
