import { ChevronDown, Download, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { HideToggle } from "@/components/app/hide-toggle";
import { Amount } from "@/components/ui/amount";
import { EmptyState, PageHeader, PeriodTabs, parsePeriod } from "@/components/app/page-header";
import { AddButton } from "@/components/app/quick-actions";
import { buttonClass } from "@/components/ui/button";
import { periodRange } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { listAccounts } from "@/server/finance/accounts";
import { listCategories } from "@/server/finance/categories";
import { toRow } from "@/server/finance/serialize";
import { getActivityBounds } from "@/server/finance/summary";
import { listTransactions, type TxType } from "@/server/finance/transactions";
import { requireUser } from "@/server/session";
import { TxList } from "./tx-list";

export const metadata: Metadata = { title: "Transactions" };

const PAGE = 60;
type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const { user, settings } = await requireUser();
  const sp = await searchParams;
  const period = parsePeriod(sp.period ?? "all_time");
  const rawType = one(sp.type);
  const type = rawType && ["income", "expense", "transfer"].includes(rawType) ? (rawType as TxType) : undefined;
  const categoryId = one(sp.category);
  const accountId = one(sp.account);
  const q = one(sp.q);
  const limit = Math.min(Number(one(sp.limit)) || PAGE, 1000);

  let range = periodRange(period, settings.timezone);
  if (period === "all_time") {
    const b = await getActivityBounds(user.id);
    range = { start: b.first ?? range.start, end: new Date(Math.max(range.end.getTime(), (b.last?.getTime() ?? 0) + 1)) };
  }

  const [rows, accounts, categories] = await Promise.all([
    listTransactions(user.id, { from: range.start, to: range.end, type, categoryId, accountId, search: q, limit: limit + 1 }),
    listAccounts(user.id),
    listCategories(user.id),
  ]);
  const hasMore = rows.length > limit;
  const shown = rows.slice(0, limit);
  const totalIn = shown.filter((r) => r.type === "income").reduce((s, r) => s + r.baseAmountMinor, 0);
  const totalOut = shown.filter((r) => r.type === "expense").reduce((s, r) => s + r.baseAmountMinor, 0);

  const filters: Record<string, string> = {};
  if (type) filters.type = type;
  if (categoryId) filters.category = categoryId;
  if (accountId) filters.account = accountId;
  if (q) filters.q = q;
  const filtered = Object.keys(filters).length > 0;

  return (
    <div className="flex flex-col gap-6 px-4 pt-4 md:px-8">
      <PageHeader
        title="Transactions"
        description={
          shown.length ? (
            <>
              <span className="tabular">
                <Amount group="summary" currency={settings.baseCurrency}>
                  {formatMoney(totalIn, settings.baseCurrency)}
                </Amount>
              </span>{" "}
              in,{" "}
              <span className="tabular">
                <Amount group="summary" currency={settings.baseCurrency}>
                  {formatMoney(totalOut, settings.baseCurrency)}
                </Amount>
              </span>{" "}
              out
              {hasMore ? ` across the ${limit} shown` : ""}
            </>
          ) : undefined
        }
        actions={
          <>
          <HideToggle group="summary" />
          <a href={`/api/transactions/export?${new URLSearchParams({ ...filters, period })}`} className={buttonClass("outline")}>
            <Download className="size-4" strokeWidth={1.75} aria-hidden />
            Export CSV
          </a>
          </>
        }
      />

      <PeriodTabs current={period} basePath="/app/transactions" extra={filters} />

      <form className="grid grid-cols-1 gap-2 rounded-[28px] bg-parchment p-3 sm:grid-cols-[1fr_repeat(3,minmax(0,170px))_auto]" action="/app/transactions">
        <input type="hidden" name="period" value={period} />
        <label className="relative">
          <span className="sr-only">Search</span>
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-graphite" strokeWidth={1.75} aria-hidden />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search payee or note"
            className="h-11 w-full rounded-[8px] border border-ash bg-white pr-4 pl-10 text-[15px] outline-none focus:border-ink"
          />
        </label>
        <FilterSelect name="type" label="Type" value={type}>
          <option value="">All types</option>
          <option value="expense">Expenses</option>
          <option value="income">Income</option>
          <option value="transfer">Transfers</option>
        </FilterSelect>
        <FilterSelect name="category" label="Category" value={categoryId}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect name="account" label="Account" value={accountId}>
          <option value="">All accounts</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </FilterSelect>
        <div className="flex gap-2">
          <button type="submit" className={buttonClass("dark", "md", "h-11 flex-1")}>
            Apply
          </button>
          {filtered && (
            <Link href={`/app/transactions?period=${period}`} className={buttonClass("ghost", "md", "h-11")}>
              Clear
            </Link>
          )}
        </div>
      </form>

      {shown.length === 0 ? (
        <EmptyState
          title={filtered ? "Nothing matches those filters" : "No entries in this period"}
          body={filtered ? "Try a wider period or clear the filters." : "Tell FinAI what you spent, or add one yourself."}
          action={!filtered ? <AddButton /> : undefined}
        />
      ) : (
        <TxList rows={shown.map((t) => toRow(t, settings.timezone))} />
      )}

      {hasMore && (
        <div className="flex justify-center pb-4">
          <Link href={`/app/transactions?${new URLSearchParams({ ...filters, period, limit: String(limit + PAGE) })}`} scroll={false} className={buttonClass("outline")}>
            Show more
          </Link>
        </div>
      )}
    </div>
  );
}

function FilterSelect({ name, label, value, children }: { name: string; label: string; value?: string; children: React.ReactNode }) {
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <select name={name} defaultValue={value ?? ""} className="h-11 w-full appearance-none rounded-[8px] border border-ash bg-white pr-9 pl-4 text-[15px] outline-none focus:border-ink">
        {children}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-graphite" strokeWidth={1.75} />
    </label>
  );
}
