import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { budgets } from "@/db/schema";
import { newId } from "@/lib/id";
import { getCategory } from "./categories";
import { FinanceError } from "./errors";
import { getCategoryBreakdown } from "./summary";

export async function listBudgets(userId: string) {
  return db.query.budgets.findMany({ where: eq(budgets.userId, userId), with: { category: true } });
}

/** Create or replace the monthly budget for a category (limit in base currency minor units). */
export async function setBudget(userId: string, categoryId: string, limitMinor: number) {
  const cat = await getCategory(userId, categoryId);
  if (!cat) throw new FinanceError("That category does not exist.");
  if (cat.kind !== "expense") throw new FinanceError("Budgets are for expense categories.");
  if (!Number.isInteger(limitMinor) || limitMinor <= 0) throw new FinanceError("Budget must be more than zero.");
  const [row] = await db
    .insert(budgets)
    .values({ id: newId("bud"), userId, categoryId, limitMinor })
    .onConflictDoUpdate({ target: [budgets.userId, budgets.categoryId], set: { limitMinor } })
    .returning();
  return { ...row, categoryName: cat.name };
}

export async function deleteBudget(userId: string, id: string) {
  await db.delete(budgets).where(and(eq(budgets.userId, userId), eq(budgets.id, id)));
}

export type BudgetProgress = {
  id: string;
  categoryId: string;
  name: string;
  color: string;
  icon: string;
  limitMinor: number;
  spentMinor: number;
  ratio: number;
};

export async function getBudgetProgress(userId: string, monthRange: { start: Date; end: Date }): Promise<BudgetProgress[]> {
  const [list, spend] = await Promise.all([listBudgets(userId), getCategoryBreakdown(userId, monthRange, "expense")]);
  const spent = new Map(spend.map((s) => [s.categoryId, s.totalMinor]));
  return list
    .map((b) => {
      const s = spent.get(b.categoryId) ?? 0;
      return {
        id: b.id,
        categoryId: b.categoryId,
        name: b.category.name,
        color: b.category.color,
        icon: b.category.icon,
        limitMinor: b.limitMinor,
        spentMinor: s,
        ratio: b.limitMinor > 0 ? s / b.limitMinor : 0,
      };
    })
    .sort((a, b) => b.ratio - a.ratio);
}
