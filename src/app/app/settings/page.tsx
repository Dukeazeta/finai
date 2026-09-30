import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { db } from "@/db";
import { account } from "@/db/schema";
import { isGoogleConfigured } from "@/lib/features";
import { requireUser } from "@/server/session";
import { SettingsView } from "./settings-view";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { user, settings } = await requireUser();
  const links = await db.select({ providerId: account.providerId }).from(account).where(eq(account.userId, user.id));

  return (
    <div className="flex flex-col gap-6 px-4 pt-4 pb-4 md:px-8">
      <PageHeader title="Settings" />
      <SettingsView
        name={user.name}
        email={user.email}
        baseCurrency={settings.baseCurrency}
        timezone={settings.timezone}
        providers={links.map((l) => l.providerId)}
        googleAvailable={isGoogleConfigured}
      />
    </div>
  );
}
