import type { Metadata } from "next";
import Link from "next/link";
import { BudgetMeterView } from "@/components/app/budget-meter";
import { CashflowChart } from "@/components/app/cashflow-chart";
import { Panel, PageHeader, PeriodTabs, parsePeriod } from "@/components/app/page-header";
import { HideToggle } from "@/components/app/hide-toggle";
import { AddButton, QuickActions } from "@/components/app/quick-actions";
import { TxRow } from "@/components/app/tx-row";
import { Amount } from "@/components/ui/amount";
import { ArrowLink } from "@/components/ui/button";
import { CategoryIcon } from "@/components/ui/category-icon";
import { LinkPending } from "@/components/ui/link-pending";
import { Money } from "@/components/ui/money";
import { localDateParts, PERIOD_LABELS, periodRange } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { getAccountBalances } from "@/server/finance/accounts";
import { getBudgetProgress } from "@/server/finance/budgets";
import { listRecurring } from "@/server/finance/recurring";
import { toRow } from "@/server/finance/serialize";
import { getActivityBounds, getCashflowSeries, getCategoryBreakdown, getPeriodSummary, previousRange } from "@/server/finance/summary";
import { listTransactions } from "@/server/finance/transactions";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Dashboard" };

function greeting(tz: string) {
  const h = Number(new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "numeric", hourCycle: "h23" }).format(new Date()));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { user, settings } = await requireUser();
  const period = parsePeriod((await searchParams).period);
  const tz = settings.timezone;
  const cur = settings.baseCurrency;

  let range = periodRange(period, tz);
  if (period === "all_time") {
    const bounds = await getActivityBounds(user.id);
    if (bounds.first) range = { start: bounds.first, end: range.end };
  }
  const monthRange = periodRange("this_month", tz);
  const long = range.end.getTime() - range.start.getTime() > 62 * 86400000;

  const [summary, prev, spend, series, recent, budgets, balances, bills] = await Promise.all([
    getPeriodSummary(user.id, range),
    period === "all_time" ? null : getPeriodSummary(user.id, previousRange(range)),
    getCategoryBreakdown(user.id, range, "expense"),
    getCashflowSeries(user.id, range, tz, long ? "month" : "day"),
    listTransactions(user.id, { limit: 7 }),
    getBudgetProgress(user.id, monthRange),
    getAccountBalances(user.id, cur),
    listRecurring(user.id),
  ]);

  const first = user.name?.split(" ")[0];
  const total = balances.reduce((s, a) => s + (a.baseBalanceMinor ?? 0), 0);
  const spendMax = spend[0]?.totalMinor ?? 0;
  const spendTop = spend.slice(0, 6);
  const spendRest = spend.slice(6).reduce((s, c) => s + c.totalMinor, 0);
  const { year, month, day } = localDateParts(tz);
  const daysLeft = new Date(Date.UTC(year, month, 0)).getUTCDate() - day;
  const upcoming = bills.filter((b) => b.active).slice(0, 4);
  const empty = summary.count === 0 && recent.length === 0;
  const spendDelta = prev ? summary.expenseMinor - prev.expenseMinor : null;

  return (
    <div className="flex flex-col gap-3 px-4 pb-4 md:px-8">
      <div className="flex flex-col gap-4 pt-1 pb-2 xl:flex-row xl:items-end xl:justify-between">
        <PageHeader
          compact
          title={`${greeting(tz)}${first ? `, ${first}` : ""}`}
          description={empty ? "Your books are open. Log the first thing that moved." : `${PERIOD_LABELS[period]} at a glance.`}
        />
        <PeriodTabs current={period} basePath="/app" />
      </div>

      <section className="grid grid-cols-1 gap-8 rounded-[28px] bg-lime p-6 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <div className="flex items-center justify-between gap-3">
            <p className="eyebrow">{summary.netMinor >= 0 ? "Left over" : "Spent more than came in"}</p>
            <div className="lg:hidden">
              <HideToggle group="summary" tone="lime" />
            </div>
          </div>
          <p className="mt-3 text-[clamp(3.5rem,8vw,5.625rem)] leading-[0.89] font-medium tracking-[-0.03em]">
            <Amount group="summary" currency={cur}>
              {formatMoney(Math.abs(summary.netMinor), cur)}
            </Amount>
          </p>
          <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-3">
            {[
              ["Money in", formatMoney(summary.incomeMinor, cur)],
              ["Money out", formatMoney(summary.expenseMinor, cur)],
              ...(summary.savingsRate != null ? [["Kept", `${Math.max(0, Math.round(summary.savingsRate * 100))}%`]] : []),
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-[13px]">{k}</dt>
                <dd className="tabular text-[22px] font-medium">
                  {k === "Kept" ? (
                    v
                  ) : (
                    <Amount group="summary" currency={cur}>
                      {v}
                    </Amount>
                  )}
                </dd>
              </div>
            ))}
          </dl>
          {spendDelta != null && prev && prev.count > 0 && spendDelta !== 0 && (
            <p className="mt-4 text-[14px]">
              <Amount group="summary" currency={cur}>
                {formatMoney(Math.abs(spendDelta), cur)}
              </Amount>{" "}
              {spendDelta > 0 ? "more" : "less"} spent than the period before.
            </p>
          )}
        </div>
        <div className="flex flex-col items-start gap-4 lg:items-end">
          <div className="hidden lg:block">
            <HideToggle group="summary" tone="lime" />
          </div>
          <QuickActions onLime />
        </div>
      </section>

      {empty ? (
        <EmptyDashboard />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <Panel tone="dark" eyebrow="Cash flow" title="Money in and out" className="lg:col-span-2">
              <CashflowChart data={series} currency={cur} />
            </Panel>

            <Panel eyebrow="Spending" title="Where it went" action={<ArrowLink href={`/app/transactions?type=expense&period=${period}`}>All</ArrowLink>}>
              {spend.length === 0 ? (
                <p className="text-[15px] text-graphite">No spending in this period.</p>
              ) : (
                <ul className="flex flex-col gap-4">
                  {spendTop.map((c) => (
                    <li key={c.categoryId ?? "none"}>
                      <Link
                        href={c.categoryId ? `/app/transactions?category=${c.categoryId}&period=${period}` : `/app/transactions?period=${period}`}
                        className="group flex items-center gap-3"
                      >
                        <CategoryIcon name={c.icon} size="sm" tone="white" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2 text-[14px]">
                            <span className="truncate group-hover:underline">{c.name}</span>
                            <span className="tabular shrink-0 font-medium">{formatMoney(c.totalMinor, cur)}</span>
                          </div>
                          <div className="mt-1.5 h-1.5 rounded-full bg-white">
                            <div className="h-full rounded-full bg-ink" style={{ width: `${Math.max(2, (c.totalMinor / spendMax) * 100)}%` }} />
                          </div>
                        </div>
                        <LinkPending />
                      </Link>
                    </li>
                  ))}
                  {spendRest > 0 && (
                    <li className="flex justify-between pl-11 text-[14px] text-graphite">
                      <span>Everything else</span>
                      <span className="tabular">{formatMoney(spendRest, cur)}</span>
                    </li>
                  )}
                </ul>
              )}
            </Panel>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <Panel eyebrow="Activity" title="Recent entries" className="lg:col-span-2" action={<ArrowLink href="/app/transactions">All entries</ArrowLink>}>
              <ul className="-my-3.5 divide-y divide-ash">
                {recent.map((tx) => (
                  <TxRow key={tx.id} tx={toRow(tx, tz)} />
                ))}
              </ul>
            </Panel>

            <div className="flex flex-col gap-3">
              <Panel eyebrow="This month" title="Budgets" action={<ArrowLink href="/app/budgets">{budgets.length ? "Manage" : "Set one"}</ArrowLink>}>
                {budgets.length === 0 ? (
                  <p className="text-[15px] text-graphite">Give a category a monthly limit, or tell FinAI &ldquo;set a 60k food budget&rdquo;.</p>
                ) : (
                  <div className="flex flex-col gap-5">
                    {budgets.slice(0, 4).map((b) => (
                      <BudgetMeterView key={b.id} {...b} currency={cur} daysLeft={daysLeft} iconTone="white" />
                    ))}
                  </div>
                )}
              </Panel>

              <Panel
                eyebrow="Balances"
                title="Accounts"
                action={
                  <div className="flex shrink-0 items-center gap-3">
                    <HideToggle group="accounts" />
                    <ArrowLink href="/app/accounts">Manage</ArrowLink>
                  </div>
                }
              >
                <ul className="flex flex-col gap-3">
                  {balances.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-3 text-[15px]">
                      <span className="truncate">{a.name}</span>
                      <Money minor={a.balanceMinor} currency={a.currency} group="accounts" className="font-medium" />
                    </li>
                  ))}
                </ul>
                {balances.length > 1 && (
                  <div className="mt-4 flex items-center justify-between border-t border-ash pt-4 text-[15px]">
                    <span className="text-graphite">Total</span>
                    <Money minor={total} currency={cur} group="accounts" className="font-medium" />
                  </div>
                )}
              </Panel>

              {upcoming.length > 0 && (
                <Panel eyebrow="Coming up" title="Bills" action={<ArrowLink href="/app/recurring">All</ArrowLink>}>
                  <ul className="flex flex-col gap-3">
                    {upcoming.map((b) => (
                      <li key={b.id} className="flex items-center justify-between gap-3 text-[15px]">
                        <div className="min-w-0">
                          <div className="truncate">{b.name}</div>
                          <div className="text-[13px] text-graphite">
                            {new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short" }).format(new Date(`${b.nextDue}T00:00:00Z`))}
                          </div>
                        </div>
                        <Money minor={b.amountMinor} currency={b.currency} type={b.type} className="font-medium" />
                      </li>
                    ))}
                  </ul>
                </Panel>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function EmptyDashboard() {
  const examples = [
    { say: "Spent 4.5k on suya", becomes: "Food and drinks", amount: "−₦4,500" },
    { say: "Bolt to work, 3,200", becomes: "Transport", amount: "−₦3,200" },
    { say: "Client paid me 150k for the logo", becomes: "Freelance", amount: "+₦150,000" },
  ];
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1.2fr]">
      <Panel eyebrow="Getting started" title="Nothing logged yet">
        <p className="max-w-[44ch] text-[15px] text-graphite">
          Tell FinAI what happened in plain words, by typing or talking. It picks the category, the account and the date, and this page fills in
          from there.
        </p>
        <div className="mt-6">
          <AddButton label="Or add one by hand" />
        </div>
      </Panel>
      <Panel tone="dark" eyebrow="Try saying" title="Things FinAI understands">
        <ul className="flex flex-col divide-y divide-white/10">
          {examples.map((e) => (
            <li key={e.say} className="flex items-center gap-4 py-3.5">
              <span className="min-w-0 flex-1 truncate text-[15px]">&ldquo;{e.say}&rdquo;</span>
              <span className="hidden text-[13px] text-ash sm:inline">{e.becomes}</span>
              <span className="tabular text-[15px] font-medium text-lime">{e.amount}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
