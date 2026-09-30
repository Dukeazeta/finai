import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { fxRates } from "@/db/schema";

/**
 * Daily exchange rates from a free, keyless API (open.er-api.com), cached per day in Postgres.
 * Returns units of `quote` per 1 unit of `base`, or null when no rate is available.
 */
export async function getRate(base: string, quote: string): Promise<number | null> {
  base = base.toUpperCase();
  quote = quote.toUpperCase();
  if (base === quote) return 1;

  const today = new Date().toISOString().slice(0, 10);
  const cached = await db.query.fxRates.findFirst({
    where: and(eq(fxRates.base, base), eq(fxRates.quote, quote), eq(fxRates.day, today)),
  });
  if (cached) return Number(cached.rate);

  const fetched = await fetchRates(base);
  if (fetched && fetched[quote]) {
    const rows = Object.entries(fetched)
      .filter(([, r]) => Number.isFinite(r) && r > 0)
      .map(([q, r]) => ({ base, quote: q, day: today, rate: r }));
    if (rows.length) await db.insert(fxRates).values(rows).onConflictDoNothing();
    return fetched[quote];
  }

  // Fall back to the most recent rate we have seen, however old.
  const stale = await db.query.fxRates.findFirst({
    where: and(eq(fxRates.base, base), eq(fxRates.quote, quote)),
    orderBy: desc(fxRates.day),
  });
  return stale ? Number(stale.rate) : null;
}

async function fetchRates(base: string): Promise<Record<string, number> | null> {
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${base}`, {
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { result?: string; rates?: Record<string, number> };
    return json.result === "success" && json.rates ? json.rates : null;
  } catch {
    return null;
  }
}
