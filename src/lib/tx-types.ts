/** Plain transaction shapes shared by server pages and client components. */

export type EditableTx = {
  id: string;
  type: "income" | "expense" | "transfer";
  amountMinor: number;
  currency: string;
  categoryId: string | null;
  accountId: string | null;
  toAccountId: string | null;
  payee: string | null;
  note: string | null;
  fxRate: number;
  /** YYYY-MM-DD in the user's timezone */
  date: string;
};

export type TxRowData = EditableTx & {
  categoryName: string | null;
  categoryIcon: string | null;
  accountName: string | null;
  toAccountName: string | null;
  source: "manual" | "chat" | "voice" | "recurring";
  baseAmountMinor: number;
  occurredAt: string;
};
