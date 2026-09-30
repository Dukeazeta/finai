import { sql } from "drizzle-orm";
import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/app/page-header";
import { PulseNav } from "@/components/pulse/pulse-nav";
import { db } from "@/db";
import { requirePulseAdmin } from "@/server/pulse/guard";

export const metadata: Metadata = { title: { default: "Pulse", template: "%s · Pulse · FinAI" }, robots: { index: false } };

export default async function PulseLayout({ children }: { children: React.ReactNode }) {
  await requirePulseAdmin();
  const [{ n }] = (await db.execute(sql`select count(*)::int as n from pulse_issues where status = 'open'`)) as unknown as { n: number }[];
  return (
    <div className="flex flex-col gap-3 px-4 pb-4 md:px-8">
      <div className="flex flex-col gap-4 pt-1 pb-2">
        <PageHeader compact title="Pulse" description="Visitors, users, errors and speed across FinAI. Only you can see this." />
        <Suspense>
          <PulseNav openIssues={n} />
        </Suspense>
      </div>
      {children}
    </div>
  );
}
