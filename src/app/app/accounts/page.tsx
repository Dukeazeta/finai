import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { getAccountBalances, listAccounts } from "@/server/finance/accounts";
import { requireUser } from "@/server/session";
import { AccountsView } from "./accounts-view";

export const metadata: Metadata = { title: "Accounts" };

export default async function AccountsPage() {
  const { user, settings } = await requireUser();
  const [balances, all] = await Promise.all([getAccountBalances(user.id, settings.baseCurrency), listAccounts(user.id, { includeArchived: true })]);
  const byId = new Map(balances.map((b) => [b.id, b]));
  const rows = all.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    currency: a.currency,
    openingBalanceMinor: a.openingBalanceMinor,
    archived: a.archived,
    balanceMinor: byId.get(a.id)?.balanceMinor ?? a.openingBalanceMinor,
    baseBalanceMinor: byId.get(a.id)?.baseBalanceMinor ?? null,
  }));

  return (
    <div className="flex flex-col gap-6 px-4 pt-4 pb-4 md:px-8">
      <PageHeader title="Accounts" description="Where your money sits." />
      <AccountsView accounts={rows} baseCurrency={settings.baseCurrency} />
    </div>
  );
}
