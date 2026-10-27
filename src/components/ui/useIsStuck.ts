"use client";

import { useEffect, useRef, useState } from "react";

// Tells you whether a `position: sticky` element is currently stuck (pinned at its `top`).
// Usage:  const [ref, stuck] = useIsStuck<HTMLDivElement>();  then  <div ref={ref} ...>
export function useIsStuck<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    let frame = 0;
    const check = () => {
      frame = 0;
      const el = ref.current;
      if (!el) return;
      const stickAt = parseFloat(getComputedStyle(el).top) || 0;
      // Stuck = it has scrolled up to its sticky position (and the page has actually moved).
      setStuck(window.scrollY > 0 && el.getBoundingClientRect().top <= stickAt + 1);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return [ref, stuck] as const;
}
