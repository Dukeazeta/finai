"use client";

import { AlertCircle, Check, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useApp } from "@/components/app/app-context";
import { ReceiptCard } from "@/components/receipt-card";
import { isReceipt, type Receipt } from "@/lib/receipt";
import { undoReceipt } from "@/server/actions";

const READ_LABELS: Record<string, string> = {
  list_accounts_and_categories: "Checked your accounts and categories",
  query_transactions: "Looked through your entries",
  get_summary: "Added up your totals",
  get_account_balances: "Checked your balances",
};

const STATUS: Record<string, string> = { created: "Logged", updated: "Updated", deleted: "Deleted", restored: "Restored" };

function dateLabel(iso: string, tz: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: tz, day: "numeric", month: "short" }).format(new Date(iso));
}

export function TransactionReceipt({ receipt }: { receipt: Extract<Receipt, { kind: "transaction" }> }) {
  const { openTxForm, timezone } = useApp();
  const router = useRouter();
  const [undone, setUndone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const { tx } = receipt;
  const meta = [tx.payee, tx.type === "transfer" ? `${tx.account} to ${tx.toAccount}` : tx.account, dateLabel(tx.occurredAt, timezone)]
    .filter(Boolean)
    .join(" · ");

  return (
    <ReceiptCard
      status={undone ? "Undone" : STATUS[receipt.action]}
      type={tx.type}
      amountMinor={tx.amountMinor}
      currency={tx.currency}
      category={tx.type === "transfer" ? "Transfer" : (tx.category ?? "Uncategorised")}
      icon={tx.categoryIcon}
      meta={meta}
      surface="parchment"
      muted={undone || receipt.action === "deleted"}
      actions={
        <>
          {!undone && receipt.action !== "deleted" && (
            <button
              type="button"
              className="border-b border-ink text-[14px] font-medium"
              onClick={() =>
                openTxForm({
                  id: tx.id,
                  type: tx.type,
                  amountMinor: tx.amountMinor,
                  currency: tx.currency,
                  categoryId: tx.categoryId,
                  accountId: tx.accountId,
                  toAccountId: tx.toAccountId,
                  payee: tx.payee,
                  note: tx.note,
                  fxRate: tx.fxRate,
                  date: new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date(tx.occurredAt)),
                })
              }
            >
              Edit
            </button>
          )}
          <button
            type="button"
            disabled={pending}
            className="text-[14px] text-graphite hover:text-ink disabled:opacity-50"
            onClick={() =>
              start(async () => {
                setError(null);
                const res = undone
                  ? await undoReceipt(receipt.action === "deleted" ? "restored" : "deleted", tx.id)
                  : await undoReceipt(receipt.action, tx.id, receipt.previous);
                if (!res.ok) return setError(res.error);
                setUndone((u) => !u);
                router.refresh();
              })
            }
          >
            {undone ? "Redo" : "Undo"}
          </button>
          {error && <span className="text-[13px] text-alert">{error}</span>}
        </>
      }
    />
  );
}

export function ToolPart({ name, state, output }: { name: string; state: string; output?: unknown }) {
  if (state === "input-streaming" || state === "input-available") {
    return (
      <div className="flex items-center gap-2 text-[14px] text-graphite" aria-live="polite">
        <span className="size-2 animate-pulse rounded-full bg-lime ring-1 ring-ink/20" />
        {name in READ_LABELS ? "Checking…" : "Writing it down…"}
      </div>
    );
  }
  if (state === "output-error") return <ToolError message="That step failed. Try again." />;
  if (state !== "output-available") return null;
  if (output && typeof output === "object" && "error" in output) return <ToolError message={String((output as { error: string }).error)} />;
  if (output && typeof output === "object" && "needsConfirmation" in output) return null;

  if (isReceipt(output)) {
    if (output.kind === "transaction") return <TransactionReceipt receipt={output} />;
    return (
      <div className="rounded-[18px] border border-ash bg-parchment p-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex size-5 items-center justify-center rounded-full bg-lime">
            <Check className="size-3" strokeWidth={2.5} aria-hidden />
          </span>
          <span className="eyebrow">{output.kind === "budget" ? "Budget set" : `New ${output.kind === "recurring" ? "bill" : output.kind}`}</span>
        </div>
        <div className="mt-2 text-[16px] font-medium">{output.name}</div>
        <div className="text-[13px] text-graphite">{output.detail}</div>
      </div>
    );
  }

  const label = READ_LABELS[name];
  if (!label) return null;
  return (
    <div className="flex items-center gap-1.5 text-[13px] text-graphite">
      <Search className="size-3.5" strokeWidth={1.75} aria-hidden />
      {label}
    </div>
  );
}

function ToolError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-[18px] border border-alert/30 bg-[#fdf1ee] px-4 py-3 text-[14px] text-alert">
      <AlertCircle className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} aria-hidden />
      {message}
    </div>
  );
}
