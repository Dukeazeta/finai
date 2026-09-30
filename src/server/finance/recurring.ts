import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { recurring } from "@/db/schema";
import { isSupportedCurrency } from "@/lib/currencies";
import { addCadence } from "@/lib/dates";
import { newId } from "@/lib/id";
import { getAccount } from "./accounts";
import { getCategory } from "./categories";
import { FinanceError } from "./errors";
import { createTransaction, type TxSource } from "./transactions";

export type RecurringInput = {
  name: string;
  type: "income" | "expense";
  amountMinor: number;
  currency: string;
  categoryId?: string | null;
  accountId?: string | null;
  cadence: "weekly" | "monthly" | "yearly";
  nextDue: string;
};

async function check(userId: string, input: Partial<RecurringInput>) {
  if (input.name !== undefined && !input.name.trim()) throw new FinanceError("Give it a name.");
  if (input.amountMinor !== undefined && (!Number.isInteger(input.amountMinor) || input.amountMinor <= 0))
    throw new FinanceError("Amount must be more than zero.");
  if (input.currency && !isSupportedCurrency(input.currency)) throw new FinanceError(`${input.currency} is not supported.`);
  if (input.nextDue && !/^\d{4}-\d{2}-\d{2}$/.test(input.nextDue)) throw new FinanceError("Next due date must be YYYY-MM-DD.");
  if (input.categoryId && !(await getCategory(userId, input.categoryId))) throw new FinanceError("That category does not exist.");
  if (input.accountId && !(await getAccount(userId, input.accountId))) throw new FinanceError("That account does not exist.");
}

export async function listRecurring(userId: string) {
  return db.query.recurring.findMany({
    where: eq(recurring.userId, userId),
    with: { category: true, account: true },
    orderBy: [asc(recurring.nextDue)],
  });
}

export async function createRecurring(userId: string, input: RecurringInput) {
  await check(userId, input);
  const [row] = await db
    .insert(recurring)
    .values({ id: newId("rec"), userId, ...input, name: input.name.trim(), currency: input.currency.toUpperCase() })
    .returning();
  return row;
}

export async function updateRecurring(userId: string, id: string, patch: Partial<RecurringInput> & { active?: boolean }) {
  await check(userId, patch);
  const [row] = await db
    .update(recurring)
    .set(patch)
    .where(and(eq(recurring.userId, userId), eq(recurring.id, id)))
    .returning();
  if (!row) throw new FinanceError("Not found.");
  return row;
}

export async function deleteRecurring(userId: string, id: string) {
  await db.delete(recurring).where(and(eq(recurring.userId, userId), eq(recurring.id, id)));
}

/** Log the payment as a transaction and move the due date forward one cycle. */
export async function markRecurringPaid(userId: string, id: string, occurredAt = new Date(), source: TxSource = "recurring") {
  const item = await db.query.recurring.findFirst({ where: and(eq(recurring.userId, userId), eq(recurring.id, id)) });
  if (!item) throw new FinanceError("Not found.");
  const tx = await createTransaction(userId, {
    type: item.type,
    amountMinor: item.amountMinor,
    currency: item.currency,
    categoryId: item.categoryId,
    accountId: item.accountId,
    payee: item.name,
    occurredAt,
    source,
  });
  const nextDue = addCadence(item.nextDue, item.cadence);
  await db.update(recurring).set({ nextDue }).where(eq(recurring.id, id));
  return { tx, nextDue };
}
