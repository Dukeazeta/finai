import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export const nf = new Intl.NumberFormat("en");

export function compact(n: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function ms(v: number | null | undefined) {
  if (v == null || Number.isNaN(v)) return "–";
  return v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)} s` : `${Math.round(v)} ms`;
}

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto", style: "short" });

export function ago(v: string | Date | null | undefined) {
  if (!v) return "never";
  const s = (new Date(v).getTime() - Date.now()) / 1000;
  const a = Math.abs(s);
  if (a < 45) return "just now";
  if (a < 3600) return rtf.format(Math.round(s / 60), "minute");
  if (a < 86400) return rtf.format(Math.round(s / 3600), "hour");
  if (a < 86400 * 30) return rtf.format(Math.round(s / 86400), "day");
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(v));
}

export function clock(v: string | Date, tz: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: tz, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(v));
}

/** A headline number with its change against the previous period of the same length. */
export function Stat({ label, now, before, upIsBad, hint }: { label: string; now: number; before?: number; upIsBad?: boolean; hint?: string }) {
  const diff = before == null ? null : now - before;
  const pct = before ? Math.round((diff! / before) * 100) : null;
  const bad = diff != null && diff !== 0 && (upIsBad ? diff > 0 : diff < 0);
  return (
    <div className="flex flex-col gap-1 rounded-[28px] bg-parchment p-5 sm:p-6">
      <span className="text-[13px] text-graphite">{label}</span>
      <span className="text-[34px] leading-[1.05] font-medium tracking-[-0.03em]">{nf.format(now)}</span>
      <span className={cn("text-[13px]", bad ? "text-alert" : "text-graphite")}>
        {diff == null
          ? hint
          : diff === 0
            ? "No change"
            : `${diff > 0 ? "↑" : "↓"} ${pct != null ? `${Math.abs(pct)}%` : nf.format(Math.abs(diff))} vs before`}
      </span>
    </div>
  );
}

/** Ranked list with a proportional bar under each row. */
export function BarList({ items, empty = "Nothing yet.", format = nf.format, label }: { items: { name: ReactNode; n: number; key?: string; sub?: ReactNode }[]; empty?: string; format?: (n: number) => string; label?: string }) {
  if (!items.length) return <p className="text-[15px] text-graphite">{empty}</p>;
  const max = Math.max(...items.map((i) => i.n), 1);
  return (
    <ul className="flex flex-col gap-3.5" aria-label={label}>
      {items.map((i, idx) => (
        <li key={i.key ?? idx}>
          <div className="flex items-baseline justify-between gap-3 text-[14px]">
            <span className="min-w-0 truncate">{i.name}</span>
            <span className="tabular shrink-0 font-medium">{format(i.n)}</span>
          </div>
          {i.sub && <div className="truncate text-[12px] text-graphite">{i.sub}</div>}
          <div className="mt-1.5 h-1.5 rounded-full bg-white">
            <div className="h-full rounded-full bg-ink" style={{ width: `${Math.max(2, (i.n / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function KindTag({ kind }: { kind: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-[12px]",
        kind === "pageview" && "bg-lime",
        kind === "click" && "border border-ash bg-white",
        kind === "auth" && "bg-ink text-white",
        kind === "event" && "bg-charcoal text-lime",
        kind === "vital" && "bg-ash",
        kind === "error" && "bg-alert text-white",
      )}
    >
      {kind === "pageview" ? "view" : kind}
    </span>
  );
}

export const COUNTRY = new Intl.DisplayNames(["en"], { type: "region" });
export function countryName(code: string) {
  try {
    return code.length === 2 ? (COUNTRY.of(code) ?? code) : code;
  } catch {
    return code;
  }
}
