import "server-only";
import type { TxRowData } from "@/lib/tx-types";
import type { TxWithRefs } from "./transactions";

/** Flattens a transaction with relations into the plain shape client rows use. */
export function toRow(tx: TxWithRefs, timezone: string): TxRowData {
  return {
    id: tx.id,
    type: tx.type,
    amountMinor: tx.amountMinor,
    baseAmountMinor: tx.baseAmountMinor,
    currency: tx.currency,
    fxRate: Number(tx.fxRate),
    categoryId: tx.categoryId,
    accountId: tx.accountId,
    toAccountId: tx.toAccountId,
    payee: tx.payee,
    note: tx.note,
    date: new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(tx.occurredAt),
    occurredAt: tx.occurredAt.toISOString(),
    categoryName: tx.category?.name ?? null,
    categoryIcon: tx.category?.icon ?? null,
    accountName: tx.account?.name ?? null,
    toAccountName: tx.toAccount?.name ?? null,
    source: tx.source,
  };
}
