/** Shapes the AI tools return so the chat and voice UIs can draw receipts. Shared by server and client. */

export type TxSummary = {
  id: string;
  type: "income" | "expense" | "transfer";
  amountMinor: number;
  currency: string;
  amount: string;
  category: string | null;
  categoryId: string | null;
  categoryIcon: string | null;
  account: string | null;
  accountId: string | null;
  toAccount: string | null;
  toAccountId: string | null;
  fxRate: number;
  payee: string | null;
  note: string | null;
  occurredAt: string;
};

export type TxSnapshot = {
  type: "income" | "expense" | "transfer";
  amountMinor: number;
  currency: string;
  categoryId: string | null;
  accountId: string | null;
  toAccountId: string | null;
  payee: string | null;
  note: string | null;
  occurredAt: string;
};

export type Receipt =
  | { kind: "transaction"; action: "created" | "updated" | "deleted" | "restored"; tx: TxSummary; previous?: TxSnapshot }
  | { kind: "account" | "category" | "budget" | "recurring"; action: "created"; name: string; detail: string };

export function isReceipt(x: unknown): x is Receipt {
  return !!x && typeof x === "object" && "kind" in x && "action" in x;
}
