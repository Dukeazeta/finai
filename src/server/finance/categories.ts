import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { categories, type Category } from "@/db/schema";
import { newId } from "@/lib/id";
import { FinanceError } from "./errors";

export const DEFAULT_CATEGORIES: { name: string; kind: "income" | "expense"; icon: string }[] = [
  { name: "Food and drinks", kind: "expense", icon: "utensils" },
  { name: "Groceries", kind: "expense", icon: "shopping-basket" },
  { name: "Transport", kind: "expense", icon: "bus" },
  { name: "Rent and housing", kind: "expense", icon: "house" },
  { name: "Bills and utilities", kind: "expense", icon: "plug" },
  { name: "Data and airtime", kind: "expense", icon: "smartphone" },
  { name: "Shopping", kind: "expense", icon: "shopping-bag" },
  { name: "Health", kind: "expense", icon: "heart-pulse" },
  { name: "Education", kind: "expense", icon: "graduation-cap" },
  { name: "Entertainment", kind: "expense", icon: "clapperboard" },
  { name: "Family and gifts", kind: "expense", icon: "gift" },
  { name: "Giving", kind: "expense", icon: "hand-heart" },
  { name: "Personal care", kind: "expense", icon: "sparkles" },
  { name: "Subscriptions", kind: "expense", icon: "repeat" },
  { name: "Other", kind: "expense", icon: "circle" },
  { name: "Salary", kind: "income", icon: "briefcase" },
  { name: "Business", kind: "income", icon: "store" },
  { name: "Freelance", kind: "income", icon: "laptop" },
  { name: "Gifts received", kind: "income", icon: "gift" },
  { name: "Interest and returns", kind: "income", icon: "trending-up" },
  { name: "Refunds", kind: "income", icon: "undo-2" },
  { name: "Other income", kind: "income", icon: "circle" },
];

/** Stable per-category colors so charts stay consistent. Assigned in insertion order. */
export const CATEGORY_COLORS = [
  "#0b7443", "#d1a883", "#3b6fb6", "#b4553d", "#7a5bb5", "#2e8c8c",
  "#c98a1b", "#715039", "#5b616b", "#9c4f86", "#4f7d2b", "#a0612a",
];

export async function seedDefaultCategories(userId: string) {
  const existing = await db.select({ id: categories.id }).from(categories).where(eq(categories.userId, userId)).limit(1);
  if (existing.length) return;
  await db
    .insert(categories)
    .values(
      DEFAULT_CATEGORIES.map((c, i) => ({
        id: newId("cat"),
        userId,
        name: c.name,
        kind: c.kind,
        icon: c.icon,
        color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
        isDefault: true,
      })),
    )
    .onConflictDoNothing();
}

export async function listCategories(userId: string, opts: { includeArchived?: boolean } = {}): Promise<Category[]> {
  return db.query.categories.findMany({
    where: opts.includeArchived
      ? eq(categories.userId, userId)
      : and(eq(categories.userId, userId), eq(categories.archived, false)),
    orderBy: [asc(categories.kind), asc(categories.name)],
  });
}

export async function getCategory(userId: string, id: string) {
  return db.query.categories.findFirst({ where: and(eq(categories.userId, userId), eq(categories.id, id)) });
}

export async function findCategoryByName(userId: string, name: string, kind?: "income" | "expense") {
  const rows = await db.query.categories.findMany({
    where: and(
      eq(categories.userId, userId),
      sql`lower(${categories.name}) = ${name.trim().toLowerCase()}`,
      kind ? eq(categories.kind, kind) : undefined,
    ),
  });
  return rows[0];
}

export async function createCategory(
  userId: string,
  input: { name: string; kind: "income" | "expense"; icon?: string; color?: string },
) {
  const name = input.name.trim();
  if (!name) throw new FinanceError("Category name is required.");
  const dupe = await findCategoryByName(userId, name, input.kind);
  if (dupe) {
    if (dupe.archived) {
      const [row] = await db.update(categories).set({ archived: false }).where(eq(categories.id, dupe.id)).returning();
      return row;
    }
    return dupe;
  }
  const count = await db.$count(categories, eq(categories.userId, userId));
  const [row] = await db
    .insert(categories)
    .values({
      id: newId("cat"),
      userId,
      name,
      kind: input.kind,
      icon: input.icon ?? "circle",
      color: input.color ?? CATEGORY_COLORS[count % CATEGORY_COLORS.length],
    })
    .returning();
  return row;
}

export async function updateCategory(
  userId: string,
  id: string,
  patch: { name?: string; icon?: string; color?: string; archived?: boolean },
) {
  const [row] = await db
    .update(categories)
    .set({ ...patch, name: patch.name?.trim() || undefined })
    .where(and(eq(categories.userId, userId), eq(categories.id, id)))
    .returning();
  if (!row) throw new FinanceError("Category not found.");
  return row;
}
