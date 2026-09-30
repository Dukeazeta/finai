"use client";

import { useEffect } from "react";

/**
 * Turns on landing motion (html.motion-ok) and marks [data-reveal] elements with data-in as they scroll into view.
 * Anything already on screen is marked first, so switching motion on never hides what the visitor is looking at.
 * Visitors who prefer reduced motion never get the class, so nothing is ever hidden for them.
 */
export function RevealObserver() {
  useEffect(() => {
    const root = document.documentElement;
    const els = [...document.querySelectorAll<HTMLElement>("[data-reveal]:not([data-in])")];
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) {
      els.forEach((el) => el.setAttribute("data-in", ""));
      return;
    }

    const below: HTMLElement[] = [];
    for (const el of els) {
      if (el.getBoundingClientRect().top < window.innerHeight * 0.92) el.setAttribute("data-in", "");
      else below.push(el);
    }
    root.classList.add("motion-ok");

    // A masked heading has no visible area until it reveals, and an observer never reports a zero-area element
    // as intersecting, so masked elements are watched through their parent.
    const targets = new Map<Element, HTMLElement[]>();
    for (const el of below) {
      const watch = el.dataset.reveal === "line" && el.parentElement ? el.parentElement : el;
      targets.set(watch, [...(targets.get(watch) ?? []), el]);
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          targets.get(e.target)?.forEach((el) => el.setAttribute("data-in", ""));
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.12 },
    );
    targets.forEach((_, watch) => io.observe(watch));
    return () => {
      io.disconnect();
      root.classList.remove("motion-ok");
    };
  }, []);
  return null;
}
