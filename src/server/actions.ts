"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { CURRENCY_CODES } from "@/lib/currencies";
import { parseLocalDate } from "@/lib/dates";
import { toMinor } from "@/lib/money";
import type { TxSnapshot } from "@/lib/receipt";
import { createAccount, updateAccount } from "@/server/finance/accounts";
import { deleteBudget, setBudget } from "@/server/finance/budgets";
import { createCategory, updateCategory } from "@/server/finance/categories";
import { errorMessage, FinanceError } from "@/server/finance/errors";
import { createRecurring, deleteRecurring, markRecurringPaid, updateRecurring } from "@/server/finance/recurring";
import { HIDE_GROUP_KEYS, type HideGroup } from "@/lib/hide-groups";
import { getSettings, setHiddenAmounts as storeHiddenAmounts, updateSettings } from "@/server/finance/settings";
import {
  createTransaction,
  restoreTransaction,
  softDeleteTransactions,
  updateTransaction,
} from "@/server/finance/transactions";
import { deleteConversation, renameConversation } from "@/server/ai/chat-store";
import { currentUserId } from "@/server/session";

export type ActionResult<T = unknown> = { ok: true; data?: T } | { ok: false; error: string };

async function uid() {
  const id = await currentUserId();
  if (!id) throw new FinanceError("Your session ended. Sign in again.");
  return id;
}

function refresh() {
  revalidatePath("/app", "layout");
}

async function run<T>(fn: (userId: string) => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn(await uid());
    refresh();
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

const currency = z.enum(CURRENCY_CODES);
const accountType = z.enum(["cash", "bank", "card", "mobile_money", "savings", "other"]);
const amount = z.coerce.number().positive("Enter an amount above zero.").max(1e13);

/* ---------------- onboarding & settings ---------------- */

const onboardingSchema = z.object({
  baseCurrency: currency,
  timezone: z.string().min(1).max(64),
  accountName: z.string().trim().min(1, "Name your first account.").max(60),
  accountType,
  openingBalance: z.coerce.number().min(0).max(1e13).default(0),
});

export async function completeOnboarding(input: z.input<typeof onboardingSchema>): Promise<ActionResult> {
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const res = await run(async (userId) => {
    const v = parsed.data;
    const tz = isValidTimezone(v.timezone) ? v.timezone : "Africa/Lagos";
    await updateSettings(userId, { baseCurrency: v.baseCurrency, timezone: tz });
    await createAccount(userId, {
      name: v.accountName,
      type: v.accountType,
      currency: v.baseCurrency,
      openingBalanceMinor: toMinor(v.openingBalance, v.baseCurrency),
    });
    await updateSettings(userId, { onboardedAt: new Date() });
  });
  if (!res.ok) return res;
  redirect("/app");
}

function isValidTimezone(tz: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export async function saveSettings(input: { baseCurrency: string; timezone: string; name: string }): Promise<ActionResult> {
  const parsed = z
    .object({ baseCurrency: currency, timezone: z.string(), name: z.string().trim().min(1, "Enter your name.").max(80) })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  return run(async (userId) => {
    if (!isValidTimezone(parsed.data.timezone)) throw new FinanceError("That timezone isn't valid.");
    await updateSettings(userId, { baseCurrency: parsed.data.baseCurrency, timezone: parsed.data.timezone });
    await db.update(user).set({ name: parsed.data.name, updatedAt: new Date() }).where(eq(user.id, userId));
  });
}

/** Hides or shows amounts for some areas. No page refresh: masking happens in the browser. */
export async function setHiddenAmounts(groups: HideGroup[], hidden: boolean): Promise<ActionResult<{ hiddenAmounts: string[] }>> {
  const parsed = z.array(z.enum(HIDE_GROUP_KEYS)).min(1).max(HIDE_GROUP_KEYS.length).safeParse(groups);
  if (!parsed.success || typeof hidden !== "boolean") return { ok: false, error: "Bad request." };
  try {
    const hiddenAmounts = await storeHiddenAmounts(await uid(), parsed.data, hidden);
    return { ok: true, data: { hiddenAmounts } };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function deleteMyAccount(confirmText: string): Promise<ActionResult> {
  if (confirmText.trim().toUpperCase() !== "DELETE") return { ok: false, error: 'Type DELETE to confirm.' };
  const res = await run(async (userId) => {
    await db.delete(user).where(eq(user.id, userId));
  });
  if (!res.ok) return res;
  redirect("/");
}

/* ---------------- transactions ---------------- */

const txSchema = z.object({
  type: z.enum(["income", "expense", "transfer"]),
  amount,
  currency,
  categoryId: z.string().optional().nullable(),
  accountId: z.string().optional().nullable(),
  toAccountId: z.string().optional().nullable(),
  payee: z.string().max(120).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
  date: z.string().min(8, "Pick a date."),
  fxRate: z.coerce.number().positive().optional().nullable(),
});

export type TxFormInput = z.input<typeof txSchema>;

export async function saveTransaction(id: string | null, input: TxFormInput): Promise<ActionResult<{ id: string }>> {
  const parsed = txSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  return run(async (userId) => {
    const v = parsed.data;
    const { timezone } = await getSettings(userId);
    const occurredAt = parseLocalDate(v.date, timezone);
    if (!occurredAt) throw new FinanceError("That date isn't valid.");
    const payload = {
      type: v.type,
      amountMinor: toMinor(v.amount, v.currency),
      currency: v.currency,
      categoryId: v.categoryId || null,
      accountId: v.accountId || null,
      toAccountId: v.toAccountId || null,
      payee: v.payee,
      note: v.note,
      occurredAt,
      fxRate: v.fxRate ?? null,
    };
    if (id) {
      const { after } = await updateTransaction(userId, id, payload);
      return { id: after.id };
    }
    const tx = await createTransaction(userId, { ...payload, source: "manual" });
    return { id: tx.id };
  });
}

export async function deleteTransactions(ids: string[]): Promise<ActionResult<{ count: number }>> {
  return run(async (userId) => ({ count: (await softDeleteTransactions(userId, ids.slice(0, 500))).length }));
}

export async function restoreTransactionAction(id: string): Promise<ActionResult> {
  return run(async (userId) => {
    await restoreTransaction(userId, id);
  });
}

/** Undo for AI receipts: created -> delete, deleted -> restore, updated -> revert to the snapshot. */
export async function undoReceipt(
  action: "created" | "updated" | "deleted" | "restored",
  txId: string,
  previous?: TxSnapshot,
): Promise<ActionResult> {
  return run(async (userId) => {
    if (action === "created" || action === "restored") await softDeleteTransactions(userId, [txId]);
    else if (action === "deleted") await restoreTransaction(userId, txId);
    else if (action === "updated" && previous)
      await updateTransaction(userId, txId, { ...previous, occurredAt: new Date(previous.occurredAt) });
  });
}

/* ---------------- accounts ---------------- */

export async function saveMoneyAccount(
  id: string | null,
  input: { name: string; type: string; currency: string; openingBalance: number | string },
): Promise<ActionResult> {
  const parsed = z
    .object({
      name: z.string().trim().min(1, "Give the account a name.").max(60),
      type: accountType,
      currency,
      openingBalance: z.coerce.number().min(-1e13).max(1e13),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  return run(async (userId) => {
    const v = parsed.data;
    const openingBalanceMinor = toMinor(v.openingBalance, v.currency);
    if (id) await updateAccount(userId, id, { name: v.name, type: v.type, openingBalanceMinor });
    else await createAccount(userId, { name: v.name, type: v.type, currency: v.currency, openingBalanceMinor });
  });
}

export async function archiveMoneyAccount(id: string, archived: boolean): Promise<ActionResult> {
  return run(async (userId) => {
    await updateAccount(userId, id, { archived });
  });
}

/* ---------------- categories ---------------- */

export async function saveCategory(
  id: string | null,
  input: { name: string; kind: "income" | "expense"; icon: string; color: string },
): Promise<ActionResult> {
  const parsed = z
    .object({
      name: z.string().trim().min(1, "Give the category a name.").max(40),
      kind: z.enum(["income", "expense"]),
      icon: z.string().max(40),
      color: z.string().regex(/^#[0-9a-f]{6}$/i),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  return run(async (userId) => {
    if (id) await updateCategory(userId, id, { name: parsed.data.name, icon: parsed.data.icon, color: parsed.data.color });
    else await createCategory(userId, parsed.data);
  });
}

export async function archiveCategory(id: string, archived: boolean): Promise<ActionResult> {
  return run(async (userId) => {
    await updateCategory(userId, id, { archived });
  });
}

/* ---------------- budgets ---------------- */

export async function saveBudget(categoryId: string, limit: number | string): Promise<ActionResult> {
  const parsed = amount.safeParse(limit);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  return run(async (userId) => {
    const { baseCurrency } = await getSettings(userId);
    await setBudget(userId, categoryId, toMinor(parsed.data, baseCurrency));
  });
}

export async function removeBudget(id: string): Promise<ActionResult> {
  return run(async (userId) => deleteBudget(userId, id));
}

/* ---------------- recurring ---------------- */

const recurringSchema = z.object({
  name: z.string().trim().min(1, "Give it a name.").max(60),
  type: z.enum(["income", "expense"]),
  amount,
  currency,
  categoryId: z.string().optional().nullable(),
  accountId: z.string().optional().nullable(),
  cadence: z.enum(["weekly", "monthly", "yearly"]),
  nextDue: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the next due date."),
});

export async function saveRecurring(id: string | null, input: z.input<typeof recurringSchema>): Promise<ActionResult> {
  const parsed = recurringSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  return run(async (userId) => {
    const v = parsed.data;
    const payload = {
      name: v.name,
      type: v.type,
      amountMinor: toMinor(v.amount, v.currency),
      currency: v.currency,
      categoryId: v.categoryId || null,
      accountId: v.accountId || null,
      cadence: v.cadence,
      nextDue: v.nextDue,
    };
    if (id) await updateRecurring(userId, id, payload);
    else await createRecurring(userId, payload);
  });
}

export async function removeRecurring(id: string): Promise<ActionResult> {
  return run(async (userId) => deleteRecurring(userId, id));
}

export async function payRecurring(id: string): Promise<ActionResult> {
  return run(async (userId) => {
    await markRecurringPaid(userId, id);
  });
}

/* ---------------- conversations ---------------- */

export async function renameChat(id: string, title: string): Promise<ActionResult> {
  return run(async (userId) => renameConversation(userId, id, title.trim() || "Untitled chat"));
}

export async function deleteChat(id: string): Promise<ActionResult> {
  return run(async (userId) => deleteConversation(userId, id));
}
