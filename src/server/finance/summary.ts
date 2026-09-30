import "server-only";
import { and, desc, eq, gte, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { categories, transactions } from "@/db/schema";

type Range = { start: Date; end: Date };

function liveInRange(userId: string, r: Range) {
  return and(
    eq(transactions.userId, userId),
    isNull(transactions.deletedAt),
    gte(transactions.occurredAt, r.start),
    lt(transactions.occurredAt, r.end),
  );
}

export type PeriodSummary = {
  incomeMinor: number;
  expenseMinor: number;
  netMinor: number;
  /** Share of income kept, 0 to 1. Null when there was no income. */
  savingsRate: number | null;
  count: number;
};

export async function getPeriodSummary(userId: string, r: Range): Promise<PeriodSummary> {
  const [row] = await db
    .select({
      income: sql<string>`coalesce(sum(${transactions.baseAmountMinor}) filter (where ${transactions.type} = 'income'), 0)`,
      expense: sql<string>`coalesce(sum(${transactions.baseAmountMinor}) filter (where ${transactions.type} = 'expense'), 0)`,
      count: sql<string>`count(*)`,
    })
    .from(transactions)
    .where(liveInRange(userId, r));
  const incomeMinor = Number(row.income);
  const expenseMinor = Number(row.expense);
  const netMinor = incomeMinor - expenseMinor;
  return {
    incomeMinor,
    expenseMinor,
    netMinor,
    savingsRate: incomeMinor > 0 ? netMinor / incomeMinor : null,
    count: Number(row.count),
  };
}

/** The period of equal length right before `r`. */
export function previousRange(r: Range): Range {
  const len = r.end.getTime() - r.start.getTime();
  return { start: new Date(r.start.getTime() - len), end: r.start };
}

export type CategorySlice = { categoryId: string | null; name: string; color: string; icon: string; totalMinor: number; count: number };

export async function getCategoryBreakdown(userId: string, r: Range, kind: "income" | "expense"): Promise<CategorySlice[]> {
  const rows = await db
    .select({
      categoryId: transactions.categoryId,
      name: categories.name,
      color: categories.color,
      icon: categories.icon,
      total: sql<string>`sum(${transactions.baseAmountMinor})`,
      count: sql<string>`count(*)`,
    })
    .from(transactions)
    .leftJoin(categories, eq(categories.id, transactions.categoryId))
    .where(and(liveInRange(userId, r), eq(transactions.type, kind)))
    .groupBy(transactions.categoryId, categories.name, categories.color, categories.icon)
    .orderBy(desc(sql`sum(${transactions.baseAmountMinor})`));
  return rows.map((x) => ({
    categoryId: x.categoryId,
    name: x.name ?? "Uncategorised",
    color: x.color ?? "#5b616b",
    icon: x.icon ?? "circle",
    totalMinor: Number(x.total),
    count: Number(x.count),
  }));
}

export type CashflowPoint = { bucket: string; incomeMinor: number; expenseMinor: number };

/** Income and expense per local day (or month), zero filled. */
export async function getCashflowSeries(
  userId: string,
  r: Range,
  tz: string,
  granularity: "day" | "month",
): Promise<CashflowPoint[]> {
  const unit = granularity === "day" ? sql.raw("'day'") : sql.raw("'month'");
  const bucketExpr = sql<string>`to_char(date_trunc(${unit}, ${transactions.occurredAt} at time zone ${tz}), ${granularity === "day" ? "YYYY-MM-DD" : "YYYY-MM"})`;
  const rows = await db
    .select({
      bucket: bucketExpr,
      income: sql<string>`coalesce(sum(${transactions.baseAmountMinor}) filter (where ${transactions.type} = 'income'), 0)`,
      expense: sql<string>`coalesce(sum(${transactions.baseAmountMinor}) filter (where ${transactions.type} = 'expense'), 0)`,
    })
    .from(transactions)
    .where(liveInRange(userId, r))
    .groupBy(sql`1`);
  const map = new Map(rows.map((x) => [x.bucket, x]));

  const out: CashflowPoint[] = [];
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
  const seen = new Set<string>();
  for (let t = r.start.getTime(); t < r.end.getTime(); t += 86400000) {
    const day = fmt.format(new Date(t));
    const key = granularity === "day" ? day : day.slice(0, 7);
    if (seen.has(key)) continue;
    seen.add(key);
    const hit = map.get(key);
    out.push({ bucket: key, incomeMinor: Number(hit?.income ?? 0), expenseMinor: Number(hit?.expense ?? 0) });
  }
  return out;
}

/** Earliest and latest transaction dates, for the all time range. */
export async function getActivityBounds(userId: string) {
  const [row] = await db
    .select({ min: sql<Date | null>`min(${transactions.occurredAt})`, max: sql<Date | null>`max(${transactions.occurredAt})` })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), isNull(transactions.deletedAt)));
  return { first: row.min ? new Date(row.min) : null, last: row.max ? new Date(row.max) : null };
}
