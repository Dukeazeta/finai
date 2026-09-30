import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { localDateParts, periodRange } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { getBudgetProgress } from "@/server/finance/budgets";
import { listCategories } from "@/server/finance/categories";
import { requireUser } from "@/server/session";
import { BudgetsView } from "./budgets-view";

export const metadata: Metadata = { title: "Budgets" };

export default async function BudgetsPage() {
  const { user, settings } = await requireUser();
  const [budgets, cats] = await Promise.all([getBudgetProgress(user.id, periodRange("this_month", settings.timezone)), listCategories(user.id)]);
  const { year, month, day } = localDateParts(settings.timezone);
  const daysLeft = new Date(Date.UTC(year, month, 0)).getUTCDate() - day;
  const totalLimit = budgets.reduce((s, b) => s + b.limitMinor, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spentMinor, 0);
  const monthName = new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: settings.timezone }).format(new Date());

  return (
    <div className="flex flex-col gap-6 px-4 pt-4 pb-4 md:px-8">
      <PageHeader
        title="Budgets"
        description={
          budgets.length
            ? `${formatMoney(totalSpent, settings.baseCurrency)} of ${formatMoney(totalLimit, settings.baseCurrency)} used in ${monthName}.`
            : "Monthly limits for the categories you care about."
        }
      />
      <BudgetsView
        budgets={budgets.map((b) => ({ id: b.id, categoryId: b.categoryId, name: b.name, icon: b.icon, limitMinor: b.limitMinor, spentMinor: b.spentMinor }))}
        categories={cats.filter((c) => c.kind === "expense").map((c) => ({ id: c.id, name: c.name }))}
        currency={settings.baseCurrency}
        daysLeft={daysLeft}
      />
    </div>
  );
}
