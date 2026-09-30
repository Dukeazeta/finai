import "server-only";
import { z } from "zod";
import type { UserSettings } from "@/db/schema";
import { CURRENCY_CODES } from "@/lib/currencies";
import { parseLocalDate, periodRange, PERIOD_LABELS, type Period } from "@/lib/dates";
import { formatMoney, toMinor } from "@/lib/money";
import { createAccount, findAccountByName, getAccount, getAccountBalances, listAccounts } from "@/server/finance/accounts";
import { setBudget } from "@/server/finance/budgets";
import { createCategory, findCategoryByName, getCategory, listCategories } from "@/server/finance/categories";
import { errorMessage, FinanceError } from "@/server/finance/errors";
import { createRecurring } from "@/server/finance/recurring";
import { getCategoryBreakdown, getPeriodSummary } from "@/server/finance/summary";
import {
  createTransaction,
  getTransaction,
  lastAiTransaction,
  listTransactions,
  restoreTransaction,
  softDeleteTransactions,
  updateTransaction,
  type TxWithRefs,
} from "@/server/finance/transactions";
import type { Receipt, TxSummary } from "@/lib/receipt";

export type ToolContext = {
  userId: string;
  settings: UserSettings;
  source: "chat" | "voice";
  conversationId?: string | null;
};

type ToolDef<S extends z.ZodType> = {
  description: string;
  schema: S;
  /** True when the tool changes data, so the UI knows to refresh. */
  writes: boolean;
  run: (ctx: ToolContext, input: z.infer<S>) => Promise<unknown>;
};

function def<S extends z.ZodType>(d: ToolDef<S>) {
  return d;
}

const currency = z.enum(CURRENCY_CODES).describe("ISO currency code. Omit to use the account's or user's base currency.");
const dateStr = z
  .string()
  .describe("Date as YYYY-MM-DD in the user's timezone, or a full ISO timestamp. Omit for right now.");

/* ---------------- helpers ---------------- */

async function resolveCategory(ctx: ToolContext, ref: string | undefined, kind: "income" | "expense") {
  if (!ref) return null;
  const byId = await getCategory(ctx.userId, ref);
  if (byId) return byId;
  const byName = await findCategoryByName(ctx.userId, ref, kind);
  if (byName) return byName;
  const names = (await listCategories(ctx.userId)).filter((c) => c.kind === kind).map((c) => c.name);
  throw new FinanceError(`No ${kind} category called "${ref}". Pick one of: ${names.join(", ")}, or create it first.`);
}

async function resolveAccount(ctx: ToolContext, ref: string | undefined) {
  if (!ref) return null;
  const byId = await getAccount(ctx.userId, ref);
  if (byId) return byId;
  const byName = await findAccountByName(ctx.userId, ref);
  if (byName) return byName;
  const names = (await listAccounts(ctx.userId)).map((a) => a.name);
  throw new FinanceError(`No account called "${ref}". Your accounts: ${names.join(", ") || "none yet"}.`);
}

function when(ctx: ToolContext, date?: string) {
  if (!date) return new Date();
  const d = parseLocalDate(date, ctx.settings.timezone);
  if (!d) throw new FinanceError(`"${date}" is not a date I understand. Use YYYY-MM-DD.`);
  return d;
}

function summarize(tx: TxWithRefs): TxSummary {
  return {
    id: tx.id,
    type: tx.type,
    amountMinor: tx.amountMinor,
    currency: tx.currency,
    amount: formatMoney(tx.amountMinor, tx.currency),
    category: tx.category?.name ?? null,
    categoryId: tx.categoryId,
    categoryIcon: tx.category?.icon ?? null,
    account: tx.account?.name ?? null,
    accountId: tx.accountId,
    toAccount: tx.toAccount?.name ?? null,
    toAccountId: tx.toAccountId,
    fxRate: Number(tx.fxRate),
    payee: tx.payee,
    note: tx.note,
    occurredAt: tx.occurredAt.toISOString(),
  };
}

async function loadSummary(ctx: ToolContext, id: string) {
  const tx = await getTransaction(ctx.userId, id, { includeDeleted: true });
  if (!tx) throw new FinanceError("Transaction not found.");
  return summarize(tx);
}

/* ---------------- tools ---------------- */

export const TOOLS = {
  list_accounts_and_categories: def({
    description:
      "List the user's money accounts and categories with their ids. Call this before logging when you are unsure which account or category matches.",
    schema: z.object({}),
    writes: false,
    run: async (ctx) => {
      const [accounts, categories] = await Promise.all([listAccounts(ctx.userId), listCategories(ctx.userId)]);
      return {
        baseCurrency: ctx.settings.baseCurrency,
        accounts: accounts.map((a) => ({ id: a.id, name: a.name, type: a.type, currency: a.currency })),
        categories: categories.map((c) => ({ id: c.id, name: c.name, kind: c.kind })),
      };
    },
  }),

  add_transaction: def({
    description:
      "Log money the user earned, spent, or moved. Use type income for money in, expense for money out, transfer for moving between their own accounts. Amount is a positive number in major units (naira, dollars), never kobo.",
    schema: z.object({
      type: z.enum(["income", "expense", "transfer"]),
      amount: z.number().positive().describe("Positive amount in major units, e.g. 4500 for ₦4,500."),
      currency: currency.optional(),
      category: z.string().optional().describe("Category name or id. Required for income and expense."),
      account: z.string().optional().describe("Account name or id the money came from or went into."),
      to_account: z.string().optional().describe("Destination account name or id. Transfers only."),
      payee: z.string().max(120).optional().describe("Who was paid or who paid, e.g. 'Shoprite' or 'Acme Ltd'."),
      note: z.string().max(500).optional(),
      date: dateStr.optional(),
    }),
    writes: true,
    run: async (ctx, i) => {
      let account = await resolveAccount(ctx, i.account);
      if (!account && i.type !== "transfer") {
        const all = await listAccounts(ctx.userId);
        if (all.length === 1) account = all[0];
      }
      const toAccount = await resolveAccount(ctx, i.to_account);
      const category = i.type === "transfer" ? null : await resolveCategory(ctx, i.category, i.type);
      const cur = i.currency ?? account?.currency ?? ctx.settings.baseCurrency;
      const tx = await createTransaction(ctx.userId, {
        type: i.type,
        amountMinor: toMinor(i.amount, cur),
        currency: cur,
        categoryId: category?.id ?? null,
        accountId: account?.id ?? null,
        toAccountId: toAccount?.id ?? null,
        payee: i.payee,
        note: i.note,
        occurredAt: when(ctx, i.date),
        source: ctx.source,
        conversationId: ctx.conversationId,
      });
      const receipt: Receipt = { kind: "transaction", action: "created", tx: await loadSummary(ctx, tx.id) };
      return receipt;
    },
  }),

  update_transaction: def({
    description: "Change an existing transaction. Only pass the fields that change.",
    schema: z.object({
      id: z.string(),
      type: z.enum(["income", "expense", "transfer"]).optional(),
      amount: z.number().positive().optional(),
      currency: currency.optional(),
      category: z.string().optional(),
      account: z.string().optional(),
      to_account: z.string().optional(),
      payee: z.string().max(120).optional(),
      note: z.string().max(500).optional(),
      date: dateStr.optional(),
    }),
    writes: true,
    run: async (ctx, i) => {
      const existing = await getTransaction(ctx.userId, i.id);
      if (!existing) throw new FinanceError("That transaction does not exist.");
      const type = i.type ?? existing.type;
      const cur = i.currency ?? existing.currency;
      const category =
        i.category !== undefined && type !== "transfer" ? await resolveCategory(ctx, i.category, type) : undefined;
      const account = i.account !== undefined ? await resolveAccount(ctx, i.account) : undefined;
      const toAccount = i.to_account !== undefined ? await resolveAccount(ctx, i.to_account) : undefined;
      const { before } = await updateTransaction(ctx.userId, i.id, {
        type: i.type,
        amountMinor: i.amount !== undefined ? toMinor(i.amount, cur) : undefined,
        currency: i.currency,
        categoryId: category === undefined ? undefined : (category?.id ?? null),
        accountId: account === undefined ? undefined : (account?.id ?? null),
        toAccountId: toAccount === undefined ? undefined : (toAccount?.id ?? null),
        payee: i.payee,
        note: i.note,
        occurredAt: i.date ? when(ctx, i.date) : undefined,
      });
      const receipt: Receipt = {
        kind: "transaction",
        action: "updated",
        tx: await loadSummary(ctx, i.id),
        previous: {
          type: before.type,
          amountMinor: before.amountMinor,
          currency: before.currency,
          categoryId: before.categoryId,
          accountId: before.accountId,
          toAccountId: before.toAccountId,
          payee: before.payee,
          note: before.note,
          occurredAt: before.occurredAt.toISOString(),
        },
      };
      return receipt;
    },
  }),

  delete_transaction: def({
    description:
      "Delete a transaction. First call with confirmed false to show the user what will be deleted and ask them. Only call with confirmed true after the user clearly says yes.",
    schema: z.object({ id: z.string(), confirmed: z.boolean() }),
    writes: true,
    run: async (ctx, i) => {
      const tx = await getTransaction(ctx.userId, i.id);
      if (!tx) throw new FinanceError("That transaction does not exist or was already deleted.");
      if (!i.confirmed) return { needsConfirmation: true, transaction: summarize(tx) };
      await softDeleteTransactions(ctx.userId, [i.id]);
      const receipt: Receipt = { kind: "transaction", action: "deleted", tx: summarize(tx) };
      return receipt;
    },
  }),

  undo_last_action: def({
    description: "Undo the most recent transaction the assistant logged in the last 24 hours, when the user says 'undo that' or 'remove the last one'.",
    schema: z.object({}),
    writes: true,
    run: async (ctx) => {
      const last = await lastAiTransaction(ctx.userId);
      if (!last) throw new FinanceError("There is nothing recent to undo.");
      await softDeleteTransactions(ctx.userId, [last.id]);
      const receipt: Receipt = { kind: "transaction", action: "deleted", tx: await loadSummary(ctx, last.id) };
      return receipt;
    },
  }),

  restore_transaction: def({
    description: "Bring back a transaction that was deleted.",
    schema: z.object({ id: z.string() }),
    writes: true,
    run: async (ctx, i) => {
      await restoreTransaction(ctx.userId, i.id);
      const receipt: Receipt = { kind: "transaction", action: "restored", tx: await loadSummary(ctx, i.id) };
      return receipt;
    },
  }),

  query_transactions: def({
    description:
      "Find transactions, e.g. 'what did I spend at Shoprite last week' or 'show my last 5 expenses'. Returns newest first.",
    schema: z.object({
      from: dateStr.optional().describe("Start date, inclusive (YYYY-MM-DD)."),
      to: dateStr.optional().describe("End date, inclusive (YYYY-MM-DD)."),
      type: z.enum(["income", "expense", "transfer"]).optional(),
      category: z.string().optional(),
      account: z.string().optional(),
      search: z.string().optional().describe("Text to match in payee or note."),
      limit: z.number().int().min(1).max(50).optional(),
    }),
    writes: false,
    run: async (ctx, i) => {
      const category = i.category ? await resolveCategory(ctx, i.category, i.type === "income" ? "income" : "expense") : null;
      const account = await resolveAccount(ctx, i.account);
      const to = i.to ? when(ctx, i.to) : undefined;
      const rows = await listTransactions(ctx.userId, {
        from: i.from ? new Date(when(ctx, i.from).getTime() - 12 * 3600e3) : undefined,
        to: to ? new Date(to.getTime() + 12 * 3600e3) : undefined,
        type: i.type,
        categoryId: category?.id,
        accountId: account?.id,
        search: i.search,
        limit: i.limit ?? 10,
      });
      return { count: rows.length, transactions: rows.map(summarize) };
    },
  }),

  get_summary: def({
    description:
      "Totals for a period: income, expenses, net, savings rate and the top categories. Use it for questions like 'how much did I spend this month' or 'how much on food last month'.",
    schema: z.object({
      period: z.enum(["this_month", "last_month", "last_30_days", "this_year", "all_time"]).optional(),
      from: dateStr.optional(),
      to: dateStr.optional(),
    }),
    writes: false,
    run: async (ctx, i) => {
      const tz = ctx.settings.timezone;
      const range =
        i.from && i.to
          ? { start: new Date(when(ctx, i.from).getTime() - 12 * 3600e3), end: new Date(when(ctx, i.to).getTime() + 12 * 3600e3) }
          : periodRange((i.period ?? "this_month") as Period, tz);
      const base = ctx.settings.baseCurrency;
      const [s, spend, earn] = await Promise.all([
        getPeriodSummary(ctx.userId, range),
        getCategoryBreakdown(ctx.userId, range, "expense"),
        getCategoryBreakdown(ctx.userId, range, "income"),
      ]);
      return {
        period: i.from && i.to ? `${i.from} to ${i.to}` : PERIOD_LABELS[(i.period ?? "this_month") as Period],
        currency: base,
        income: formatMoney(s.incomeMinor, base),
        expenses: formatMoney(s.expenseMinor, base),
        net: formatMoney(s.netMinor, base),
        savingsRate: s.savingsRate == null ? null : `${Math.round(s.savingsRate * 100)}%`,
        transactionCount: s.count,
        spendingByCategory: spend.map((c) => ({ category: c.name, total: formatMoney(c.totalMinor, base), count: c.count })),
        incomeByCategory: earn.map((c) => ({ category: c.name, total: formatMoney(c.totalMinor, base), count: c.count })),
      };
    },
  }),

  get_account_balances: def({
    description: "Current balance of each money account.",
    schema: z.object({}),
    writes: false,
    run: async (ctx) => {
      const rows = await getAccountBalances(ctx.userId, ctx.settings.baseCurrency);
      return rows.map((a) => ({ id: a.id, name: a.name, type: a.type, balance: formatMoney(a.balanceMinor, a.currency) }));
    },
  }),

  create_account: def({
    description: "Add a money account such as a bank account, card, cash wallet, or mobile money wallet.",
    schema: z.object({
      name: z.string().min(1).max(60),
      type: z.enum(["cash", "bank", "card", "mobile_money", "savings", "other"]),
      currency: currency.optional(),
      opening_balance: z.number().optional().describe("Current balance in major units. Defaults to 0."),
    }),
    writes: true,
    run: async (ctx, i) => {
      const cur = i.currency ?? ctx.settings.baseCurrency;
      const a = await createAccount(ctx.userId, {
        name: i.name,
        type: i.type,
        currency: cur,
        openingBalanceMinor: toMinor(i.opening_balance ?? 0, cur),
      });
      const receipt: Receipt = { kind: "account", action: "created", name: a.name, detail: `${a.type.replace("_", " ")} · ${a.currency}` };
      return receipt;
    },
  }),

  create_category: def({
    description: "Add a new income or expense category.",
    schema: z.object({ name: z.string().min(1).max(40), kind: z.enum(["income", "expense"]) }),
    writes: true,
    run: async (ctx, i) => {
      const c = await createCategory(ctx.userId, i);
      const receipt: Receipt = { kind: "category", action: "created", name: c.name, detail: c.kind };
      return receipt;
    },
  }),

  set_budget: def({
    description: "Set or change the monthly spending limit for an expense category, in the user's base currency.",
    schema: z.object({ category: z.string(), monthly_limit: z.number().positive() }),
    writes: true,
    run: async (ctx, i) => {
      const cat = await resolveCategory(ctx, i.category, "expense");
      const b = await setBudget(ctx.userId, cat!.id, toMinor(i.monthly_limit, ctx.settings.baseCurrency));
      const receipt: Receipt = {
        kind: "budget",
        action: "created",
        name: b.categoryName,
        detail: `${formatMoney(b.limitMinor, ctx.settings.baseCurrency)} a month`,
      };
      return receipt;
    },
  }),

  add_recurring: def({
    description: "Track a repeating bill, subscription, or income (rent, Netflix, salary) so it shows as upcoming. It does not log payments by itself.",
    schema: z.object({
      name: z.string().min(1).max(60),
      type: z.enum(["income", "expense"]),
      amount: z.number().positive(),
      currency: currency.optional(),
      category: z.string().optional(),
      account: z.string().optional(),
      cadence: z.enum(["weekly", "monthly", "yearly"]),
      next_due: z.string().describe("Next due date, YYYY-MM-DD."),
    }),
    writes: true,
    run: async (ctx, i) => {
      const account = await resolveAccount(ctx, i.account);
      const category = await resolveCategory(ctx, i.category, i.type);
      const cur = i.currency ?? account?.currency ?? ctx.settings.baseCurrency;
      const r = await createRecurring(ctx.userId, {
        name: i.name,
        type: i.type,
        amountMinor: toMinor(i.amount, cur),
        currency: cur,
        categoryId: category?.id ?? null,
        accountId: account?.id ?? null,
        cadence: i.cadence,
        nextDue: i.next_due,
      });
      const receipt: Receipt = {
        kind: "recurring",
        action: "created",
        name: r.name,
        detail: `${formatMoney(r.amountMinor, r.currency)} ${r.cadence}, next on ${r.nextDue}`,
      };
      return receipt;
    },
  }),
} as const;

export type ToolName = keyof typeof TOOLS;

export const WRITE_TOOLS = new Set(Object.entries(TOOLS).filter(([, t]) => t.writes).map(([n]) => n));

/** Runs a tool by name with untrusted input (voice path). Never throws; errors come back as { error }. */
export async function runTool(ctx: ToolContext, name: string, rawInput: unknown) {
  const tool = (TOOLS as Record<string, ToolDef<z.ZodType>>)[name];
  if (!tool) return { error: `Unknown tool ${name}` };
  const parsed = tool.schema.safeParse(rawInput ?? {});
  if (!parsed.success) return { error: `Invalid input: ${parsed.error.issues.map((x) => `${x.path.join(".")} ${x.message}`).join("; ")}` };
  try {
    return await tool.run(ctx, parsed.data);
  } catch (e) {
    return { error: errorMessage(e) };
  }
}
