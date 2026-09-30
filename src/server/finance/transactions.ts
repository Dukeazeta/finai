import "server-only";
import { and, desc, eq, gte, ilike, inArray, isNull, lt, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { transactions, type Transaction } from "@/db/schema";
import { isSupportedCurrency } from "@/lib/currencies";
import { newId } from "@/lib/id";
import { convertMinor } from "@/lib/money";
import { getAccount } from "./accounts";
import { getCategory } from "./categories";
import { FinanceError } from "./errors";
import { getRate } from "./fx";
import { getSettings } from "./settings";

export type TxType = Transaction["type"];
export type TxSource = Transaction["source"];

export type TxInput = {
  type: TxType;
  amountMinor: number;
  currency: string;
  categoryId?: string | null;
  accountId?: string | null;
  toAccountId?: string | null;
  payee?: string | null;
  note?: string | null;
  occurredAt: Date;
  /** Units of base currency per 1 unit of `currency`. Looked up when omitted. */
  fxRate?: number | null;
  source?: TxSource;
  conversationId?: string | null;
};

async function resolveRefs(userId: string, input: Pick<TxInput, "type" | "categoryId" | "accountId" | "toAccountId">) {
  if (input.categoryId) {
    const cat = await getCategory(userId, input.categoryId);
    if (!cat) throw new FinanceError("That category does not exist.");
    if (input.type !== "transfer" && cat.kind !== input.type)
      throw new FinanceError(`${cat.name} is an ${cat.kind} category, so it can't be used for ${input.type}.`);
  }
  if (input.accountId && !(await getAccount(userId, input.accountId))) throw new FinanceError("That account does not exist.");
  if (input.toAccountId && !(await getAccount(userId, input.toAccountId)))
    throw new FinanceError("The destination account does not exist.");
  if (input.type === "transfer") {
    if (!input.accountId || !input.toAccountId) throw new FinanceError("A transfer needs a from account and a to account.");
    if (input.accountId === input.toAccountId) throw new FinanceError("A transfer needs two different accounts.");
  }
}

async function baseAmount(userId: string, amountMinor: number, currency: string, fxRate?: number | null) {
  const { baseCurrency } = await getSettings(userId);
  if (currency === baseCurrency) return { fxRate: 1, baseAmountMinor: amountMinor };
  const rate = fxRate ?? (await getRate(currency, baseCurrency));
  if (rate == null || !(rate > 0))
    throw new FinanceError(`I couldn't get an exchange rate for ${currency} to ${baseCurrency}. Add the rate manually.`);
  return { fxRate: rate, baseAmountMinor: convertMinor(amountMinor, currency, baseCurrency, rate) };
}

function validateCore(input: Pick<TxInput, "amountMinor" | "currency" | "occurredAt">) {
  if (!Number.isInteger(input.amountMinor) || input.amountMinor <= 0) throw new FinanceError("Amount must be more than zero.");
  if (input.amountMinor > 1e15) throw new FinanceError("That amount is too large.");
  if (!isSupportedCurrency(input.currency)) throw new FinanceError(`${input.currency} is not a supported currency.`);
  if (Number.isNaN(input.occurredAt.getTime())) throw new FinanceError("That date is not valid.");
}

export async function createTransaction(userId: string, input: TxInput): Promise<Transaction> {
  const currency = input.currency.toUpperCase();
  validateCore({ ...input, currency });
  await resolveRefs(userId, input);
  const fx = await baseAmount(userId, input.amountMinor, currency, input.fxRate);
  const [row] = await db
    .insert(transactions)
    .values({
      id: newId("tx"),
      userId,
      type: input.type,
      amountMinor: input.amountMinor,
      currency,
      ...fx,
      categoryId: input.type === "transfer" ? null : (input.categoryId ?? null),
      accountId: input.accountId ?? null,
      toAccountId: input.type === "transfer" ? (input.toAccountId ?? null) : null,
      payee: input.payee?.trim() || null,
      note: input.note?.trim() || null,
      occurredAt: input.occurredAt,
      source: input.source ?? "manual",
      conversationId: input.conversationId ?? null,
    })
    .returning();
  return row;
}

export async function getTransaction(userId: string, id: string, opts: { includeDeleted?: boolean } = {}) {
  return db.query.transactions.findFirst({
    where: and(
      eq(transactions.userId, userId),
      eq(transactions.id, id),
      opts.includeDeleted ? undefined : isNull(transactions.deletedAt),
    ),
    with: { category: true, account: true, toAccount: true },
  });
}

export async function updateTransaction(
  userId: string,
  id: string,
  patch: Partial<Omit<TxInput, "source" | "conversationId">>,
): Promise<{ before: Transaction; after: Transaction }> {
  const before = await db.query.transactions.findFirst({
    where: and(eq(transactions.userId, userId), eq(transactions.id, id), isNull(transactions.deletedAt)),
  });
  if (!before) throw new FinanceError("That transaction does not exist or was deleted.");

  const merged = {
    type: patch.type ?? before.type,
    amountMinor: patch.amountMinor ?? before.amountMinor,
    currency: (patch.currency ?? before.currency).toUpperCase(),
    categoryId: patch.categoryId !== undefined ? patch.categoryId : before.categoryId,
    accountId: patch.accountId !== undefined ? patch.accountId : before.accountId,
    toAccountId: patch.toAccountId !== undefined ? patch.toAccountId : before.toAccountId,
    occurredAt: patch.occurredAt ?? before.occurredAt,
  };
  validateCore(merged);
  await resolveRefs(userId, merged);

  const moneyChanged =
    merged.amountMinor !== before.amountMinor || merged.currency !== before.currency || patch.fxRate != null;
  const fx = moneyChanged
    ? await baseAmount(userId, merged.amountMinor, merged.currency, patch.fxRate ?? (merged.currency === before.currency ? before.fxRate : null))
    : { fxRate: before.fxRate, baseAmountMinor: before.baseAmountMinor };

  const [after] = await db
    .update(transactions)
    .set({
      ...merged,
      ...fx,
      categoryId: merged.type === "transfer" ? null : merged.categoryId,
      toAccountId: merged.type === "transfer" ? merged.toAccountId : null,
      payee: patch.payee !== undefined ? patch.payee?.trim() || null : before.payee,
      note: patch.note !== undefined ? patch.note?.trim() || null : before.note,
      updatedAt: new Date(),
    })
    .where(and(eq(transactions.userId, userId), eq(transactions.id, id)))
    .returning();
  return { before, after };
}

export async function softDeleteTransactions(userId: string, ids: string[]) {
  if (!ids.length) return [];
  return db
    .update(transactions)
    .set({ deletedAt: new Date() })
    .where(and(eq(transactions.userId, userId), inArray(transactions.id, ids), isNull(transactions.deletedAt)))
    .returning({ id: transactions.id });
}

export async function restoreTransaction(userId: string, id: string) {
  const [row] = await db
    .update(transactions)
    .set({ deletedAt: null })
    .where(and(eq(transactions.userId, userId), eq(transactions.id, id)))
    .returning();
  if (!row) throw new FinanceError("That transaction could not be restored.");
  return row;
}

export type TxFilters = {
  from?: Date;
  to?: Date;
  type?: TxType;
  categoryId?: string;
  accountId?: string;
  source?: TxSource;
  search?: string;
  limit?: number;
  offset?: number;
};

export async function listTransactions(userId: string, f: TxFilters = {}) {
  const where: (SQL | undefined)[] = [eq(transactions.userId, userId), isNull(transactions.deletedAt)];
  if (f.from) where.push(gte(transactions.occurredAt, f.from));
  if (f.to) where.push(lt(transactions.occurredAt, f.to));
  if (f.type) where.push(eq(transactions.type, f.type));
  if (f.categoryId) where.push(eq(transactions.categoryId, f.categoryId));
  if (f.accountId) where.push(or(eq(transactions.accountId, f.accountId), eq(transactions.toAccountId, f.accountId)));
  if (f.source) where.push(eq(transactions.source, f.source));
  if (f.search?.trim()) {
    const q = `%${f.search.trim().replace(/[%_]/g, "")}%`;
    where.push(or(ilike(transactions.payee, q), ilike(transactions.note, q)));
  }
  return db.query.transactions.findMany({
    where: and(...where),
    with: { category: true, account: true, toAccount: true },
    orderBy: [desc(transactions.occurredAt), desc(transactions.createdAt)],
    limit: Math.min(f.limit ?? 50, 500),
    offset: f.offset ?? 0,
  });
}

export type TxWithRefs = Awaited<ReturnType<typeof listTransactions>>[number];

/** Most recent live transaction the AI created, for "undo that". */
export async function lastAiTransaction(userId: string) {
  return db.query.transactions.findFirst({
    where: and(
      eq(transactions.userId, userId),
      isNull(transactions.deletedAt),
      inArray(transactions.source, ["chat", "voice"]),
      gte(transactions.createdAt, new Date(Date.now() - 24 * 3600 * 1000)),
    ),
    orderBy: desc(transactions.createdAt),
  });
}
