"use client";

import { usePathname } from "next/navigation";
import { useReportWebVitals } from "next/web-vitals";
import { useEffect } from "react";
import { flush, isNewVisit, pulse, send } from "@/lib/pulse";

const CLICKABLE = "a,button,summary,label,[role=button],[role=tab],[role=menuitem],input[type=submit],[data-pulse]";

/** Inside the app, amounts in labels are the user's money, so they are masked before leaving the browser. */
function label(el: Element, inApp: boolean) {
  const raw =
    el.getAttribute("data-pulse") ||
    el.getAttribute("aria-label") ||
    el.getAttribute("title") ||
    (el as HTMLElement).innerText ||
    el.getAttribute("href") ||
    el.tagName.toLowerCase();
  const text = raw.replace(/\s+/g, " ").trim().slice(0, 80);
  return inApp ? text.replace(/[₦$€£]?\s?\d[\d,.]*\s?[kKmM]?/g, "#") : text;
}

function hrefOf(el: Element) {
  const href = el.getAttribute("href");
  if (!href) return null;
  try {
    const u = new URL(href, location.href);
    return u.origin === location.origin ? u.pathname : u.host;
  } catch {
    return null;
  }
}

/** Mounted once in the root layout: page views, clicks, errors and Core Web Vitals. */
export function PulseTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const fresh = isNewVisit();
    const ref = document.referrer && !document.referrer.startsWith(location.origin) ? new URL(document.referrer).host : undefined;
    const q = new URLSearchParams(location.search);
    const utm = Object.fromEntries(["utm_source", "utm_medium", "utm_campaign"].filter((k) => q.get(k)).map((k) => [k, q.get(k)!.slice(0, 100)]));
    // The first page of a visit carries where the visitor came from.
    const d = fresh ? { entry: true, ...utm } : Object.keys(utm).length ? utm : undefined;
    send({ k: "pageview", n: pathname, p: pathname, r: fresh ? ref : undefined, d });
  }, [pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.(CLICKABLE);
      if (!el || el.closest("[data-pulse-ignore]")) return;
      const inApp = location.pathname.startsWith("/app");
      const href = hrefOf(el);
      send({ k: "click", n: label(el, inApp), d: { tag: el.tagName.toLowerCase(), ...(href ? { href } : {}) } });
    };
    const onError = (e: ErrorEvent) => pulse.error(e.error ?? new Error(e.message), { kind: "onerror", file: e.filename?.split("/").pop() ?? null });
    const onRejection = (e: PromiseRejectionEvent) => pulse.error(e.reason, { kind: "unhandledrejection" });
    const onHide = () => document.visibilityState === "hidden" && flush(true);
    const onPageHide = () => flush(true);

    document.addEventListener("click", onClick, { capture: true });
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("click", onClick, { capture: true });
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, []);

  useReportWebVitals((m) => {
    // CLS is a unitless score; the rest are milliseconds.
    const val = m.name === "CLS" ? Math.round(m.value * 1000) / 1000 : Math.round(m.value);
    send({ k: "vital", n: m.name, val, d: { rating: m.rating } });
  });

  return null;
}
