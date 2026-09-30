import { and, eq, isNull, sql } from "drizzle-orm";
import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { listCategories } from "@/server/finance/categories";
import { requireUser } from "@/server/session";
import { CategoriesView } from "./categories-view";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const { user } = await requireUser();
  const [cats, counts] = await Promise.all([
    listCategories(user.id, { includeArchived: true }),
    db
      .select({ id: transactions.categoryId, n: sql<string>`count(*)` })
      .from(transactions)
      .where(and(eq(transactions.userId, user.id), isNull(transactions.deletedAt)))
      .groupBy(transactions.categoryId),
  ]);
  const byId = new Map(counts.map((c) => [c.id, Number(c.n)]));

  return (
    <div className="flex flex-col gap-6 px-4 pt-4 pb-4 md:px-8">
      <PageHeader title="Categories" description="FinAI sorts every entry into one of these. Rename them or add your own." />
      <CategoriesView
        categories={cats.map((c) => ({ id: c.id, name: c.name, kind: c.kind, icon: c.icon, archived: c.archived, count: byId.get(c.id) ?? 0 }))}
      />
    </div>
  );
}
