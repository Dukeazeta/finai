import { redirect } from "next/navigation";
import { AppProvider } from "@/components/app/app-context";
import { AppShell } from "@/components/app/app-shell";
import { listAccounts } from "@/server/finance/accounts";
import { listCategories } from "@/server/finance/categories";
import { requireUser } from "@/server/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, settings } = await requireUser();
  if (!settings.onboardedAt) redirect("/onboarding");
  const [accounts, categories] = await Promise.all([listAccounts(user.id), listCategories(user.id)]);

  return (
    <AppProvider
      user={{ name: user.name, email: user.email, image: user.image }}
      baseCurrency={settings.baseCurrency}
      timezone={settings.timezone}
      accounts={accounts.map((a) => ({ id: a.id, name: a.name, type: a.type, currency: a.currency }))}
      categories={categories.map((c) => ({ id: c.id, name: c.name, kind: c.kind, icon: c.icon }))}
    >
      <AppShell>{children}</AppShell>
    </AppProvider>
  );
}
