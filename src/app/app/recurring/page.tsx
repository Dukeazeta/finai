import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { localDateString } from "@/lib/dates";
import { listRecurring } from "@/server/finance/recurring";
import { requireUser } from "@/server/session";
import { RecurringView } from "./recurring-view";

export const metadata: Metadata = { title: "Bills" };

export default async function RecurringPage() {
  const { user, settings } = await requireUser();
  const items = await listRecurring(user.id);
  const today = Date.parse(`${localDateString(settings.timezone)}T00:00:00Z`);

  return (
    <div className="flex flex-col gap-6 px-4 pt-4 pb-4 md:px-8">
      <PageHeader title="Bills and repeats" description="What's coming up. Nothing is logged until you mark it paid." />
      <RecurringView
        items={items.map((r) => ({
          id: r.id,
          name: r.name,
          type: r.type,
          amountMinor: r.amountMinor,
          currency: r.currency,
          categoryId: r.categoryId,
          categoryIcon: r.category?.icon ?? null,
          accountId: r.accountId,
          cadence: r.cadence,
          nextDue: r.nextDue,
          daysUntil: Math.round((Date.parse(`${r.nextDue}T00:00:00Z`) - today) / 86400000),
        }))}
      />
    </div>
  );
}
