/**
 * Timezone helpers without a tz library. Money is grouped by the user's local day and month,
 * so period boundaries are computed in the user's timezone and converted to UTC instants.
 */

function partsIn(tz: string, d: Date) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const out: Record<string, number> = {};
  for (const p of fmt.formatToParts(d)) if (p.type !== "literal") out[p.type] = Number(p.value);
  return out as { year: number; month: number; day: number; hour: number; minute: number; second: number };
}

/** Offset of `tz` from UTC at instant `d`, in minutes. */
export function tzOffsetMinutes(tz: string, d: Date): number {
  const p = partsIn(tz, d);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - d.getTime()) / 60000);
}

/** The UTC instant of a wall-clock time in `tz`. */
export function zonedToUtc(tz: string, y: number, m: number, d: number, hh = 0, mm = 0): Date {
  const guess = new Date(Date.UTC(y, m - 1, d, hh, mm));
  const offset = tzOffsetMinutes(tz, guess);
  const first = new Date(guess.getTime() - offset * 60000);
  const offset2 = tzOffsetMinutes(tz, first);
  return offset2 === offset ? first : new Date(guess.getTime() - offset2 * 60000);
}

export function localDateParts(tz: string, d = new Date()) {
  const p = partsIn(tz, d);
  return { year: p.year, month: p.month, day: p.day };
}

/** YYYY-MM-DD for `d` in `tz`. */
export function localDateString(tz: string, d = new Date()): string {
  const { year, month, day } = localDateParts(tz, d);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export type Period = "this_month" | "last_month" | "last_30_days" | "this_year" | "all_time";

export const PERIOD_LABELS: Record<Period, string> = {
  this_month: "This month",
  last_month: "Last month",
  last_30_days: "Last 30 days",
  this_year: "This year",
  all_time: "All time",
};

export function periodRange(period: Period, tz: string, now = new Date()): { start: Date; end: Date } {
  const { year, month, day } = localDateParts(tz, now);
  switch (period) {
    case "this_month":
      return { start: zonedToUtc(tz, year, month, 1), end: zonedToUtc(tz, month === 12 ? year + 1 : year, month === 12 ? 1 : month + 1, 1) };
    case "last_month": {
      const py = month === 1 ? year - 1 : year;
      const pm = month === 1 ? 12 : month - 1;
      return { start: zonedToUtc(tz, py, pm, 1), end: zonedToUtc(tz, year, month, 1) };
    }
    case "last_30_days": {
      const end = zonedToUtc(tz, year, month, day + 1);
      return { start: new Date(end.getTime() - 30 * 86400000), end };
    }
    case "this_year":
      return { start: zonedToUtc(tz, year, 1, 1), end: zonedToUtc(tz, year + 1, 1, 1) };
    case "all_time":
      return { start: new Date(Date.UTC(1970, 0, 1)), end: zonedToUtc(tz, year, month, day + 1) };
  }
}

/** Parse "YYYY-MM-DD" or an ISO string into a UTC instant, treating bare dates as local noon in `tz`. */
export function parseLocalDate(input: string, tz: string): Date | null {
  const bare = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (bare) return zonedToUtc(tz, Number(bare[1]), Number(bare[2]), Number(bare[3]), 12, 0);
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function addCadence(dateStr: string, cadence: "weekly" | "monthly" | "yearly"): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  if (cadence === "weekly") base.setUTCDate(base.getUTCDate() + 7);
  if (cadence === "monthly") {
    const target = new Date(Date.UTC(y, m, 1));
    const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    target.setUTCDate(Math.min(d, lastDay));
    return target.toISOString().slice(0, 10);
  }
  if (cadence === "yearly") base.setUTCFullYear(y + 1);
  return base.toISOString().slice(0, 10);
}
