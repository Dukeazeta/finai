import "server-only";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { moneyAccounts, transactions, type MoneyAccount } from "@/db/schema";
import { isSupportedCurrency } from "@/lib/currencies";
import { newId } from "@/lib/id";
import { convertMinor } from "@/lib/money";
import { FinanceError } from "./errors";
import { getRate } from "./fx";

export type AccountType = MoneyAccount["type"];

export async function listAccounts(userId: string, opts: { includeArchived?: boolean } = {}) {
  return db.query.moneyAccounts.findMany({
    where: opts.includeArchived
      ? eq(moneyAccounts.userId, userId)
      : and(eq(moneyAccounts.userId, userId), eq(moneyAccounts.archived, false)),
    orderBy: [asc(moneyAccounts.createdAt)],
  });
}

export async function getAccount(userId: string, id: string) {
  return db.query.moneyAccounts.findFirst({ where: and(eq(moneyAccounts.userId, userId), eq(moneyAccounts.id, id)) });
}

export async function findAccountByName(userId: string, name: string) {
  const rows = await db.query.moneyAccounts.findMany({
    where: and(eq(moneyAccounts.userId, userId), sql`lower(${moneyAccounts.name}) = ${name.trim().toLowerCase()}`),
  });
  return rows[0];
}

export async function createAccount(
  userId: string,
  input: { name: string; type: AccountType; currency: string; openingBalanceMinor?: number },
) {
  const name = input.name.trim();
  if (!name) throw new FinanceError("Account name is required.");
  if (!isSupportedCurrency(input.currency)) throw new FinanceError(`${input.currency} is not a supported currency.`);
  const existing = await findAccountByName(userId, name);
  if (existing && !existing.archived) throw new FinanceError(`You already have an account called ${existing.name}.`);
  const [row] = await db
    .insert(moneyAccounts)
    .values({
      id: newId("acc"),
      userId,
      name,
      type: input.type,
      currency: input.currency.toUpperCase(),
      openingBalanceMinor: input.openingBalanceMinor ?? 0,
    })
    .returning();
  return row;
}

export async function updateAccount(
  userId: string,
  id: string,
  patch: { name?: string; type?: AccountType; openingBalanceMinor?: number; archived?: boolean },
) {
  const [row] = await db
    .update(moneyAccounts)
    .set({ ...patch, name: patch.name?.trim() || undefined })
    .where(and(eq(moneyAccounts.userId, userId), eq(moneyAccounts.id, id)))
    .returning();
  if (!row) throw new FinanceError("Account not found.");
  return row;
}

export type AccountBalance = MoneyAccount & { balanceMinor: number; baseBalanceMinor: number | null };

/**
 * Balance per account in its own currency: opening balance, plus income and transfers in,
 * minus expenses and transfers out. Entries in a different currency are converted at today's rate.
 */
export async function getAccountBalances(userId: string, baseCurrency: string): Promise<AccountBalance[]> {
  const accounts = await listAccounts(userId);
  if (!accounts.length) return [];

  const flows = await db
    .select({
      accountId: transactions.accountId,
      toAccountId: transactions.toAccountId,
      type: transactions.type,
      currency: transactions.currency,
      total: sql<string>`sum(${transactions.amountMinor})`,
    })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), isNull(transactions.deletedAt)))
    .groupBy(transactions.accountId, transactions.toAccountId, transactions.type, transactions.currency);

  const byId = new Map(accounts.map((a) => [a.id, { ...a, balanceMinor: a.openingBalanceMinor }]));
  const rateCache = new Map<string, number | null>();
  const rate = async (from: string, to: string) => {
    const k = `${from}>${to}`;
    if (!rateCache.has(k)) rateCache.set(k, await getRate(from, to));
    return rateCache.get(k)!;
  };

  const apply = async (accountId: string | null, currency: string, amount: number, sign: 1 | -1) => {
    if (!accountId) return;
    const acc = byId.get(accountId);
    if (!acc) return;
    let value = amount;
    if (currency !== acc.currency) {
      const r = await rate(currency, acc.currency);
      if (r == null) return;
      value = convertMinor(amount, currency, acc.currency, r);
    }
    acc.balanceMinor += sign * value;
  };

  for (const f of flows) {
    const amount = Number(f.total);
    if (f.type === "income") await apply(f.accountId, f.currency, amount, 1);
    else if (f.type === "expense") await apply(f.accountId, f.currency, amount, -1);
    else {
      await apply(f.accountId, f.currency, amount, -1);
      await apply(f.toAccountId, f.currency, amount, 1);
    }
  }

  const out: AccountBalance[] = [];
  for (const a of byId.values()) {
    let baseBalanceMinor: number | null = a.balanceMinor;
    if (a.currency !== baseCurrency) {
      const r = await rate(a.currency, baseCurrency);
      baseBalanceMinor = r == null ? null : convertMinor(a.balanceMinor, a.currency, baseCurrency, r);
    }
    out.push({ ...a, baseBalanceMinor });
  }
  return out;
}
