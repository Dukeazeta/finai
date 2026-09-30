"use client";

import { AudioLines, MessageCircle } from "lucide-react";
import { CategoryIcon } from "@/components/ui/category-icon";
import { Money } from "@/components/ui/money";
import { cn } from "@/lib/cn";
import type { TxRowData } from "@/lib/tx-types";
import { useApp } from "./app-context";

export type { TxRowData };

export function TxRow({
  tx,
  selectable,
  selected,
  onSelect,
  iconTone = "white",
}: {
  tx: TxRowData;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (v: boolean) => void;
  iconTone?: "white" | "parchment";
}) {
  const { openTxForm, timezone, baseCurrency } = useApp();
  const title = tx.type === "transfer" ? `${tx.accountName ?? "?"} to ${tx.toAccountName ?? "?"}` : tx.payee || tx.categoryName || "Uncategorised";
  const sub = [
    tx.type === "transfer" ? "Transfer" : tx.payee ? tx.categoryName : null,
    tx.type !== "transfer" ? tx.accountName : null,
    new Intl.DateTimeFormat("en-GB", { timeZone: timezone, day: "numeric", month: "short" }).format(new Date(tx.occurredAt)),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className={cn("group flex items-center gap-3 py-3.5", selected && "-mx-3 rounded-[18px] bg-lime-soft px-3")}>
      {selectable && (
        <input type="checkbox" checked={selected} onChange={(e) => onSelect?.(e.target.checked)} aria-label={`Select ${title}`} className="size-4 shrink-0 accent-ink" />
      )}
      <button type="button" onClick={() => openTxForm(tx)} className="flex min-w-0 flex-1 items-center gap-3 rounded-[12px] text-left">
        <CategoryIcon name={tx.type === "transfer" ? "transfer" : tx.categoryIcon} tone={iconTone} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[15px] font-medium group-hover:underline">{title}</span>
            {tx.source === "chat" && <MessageCircle className="size-3.5 shrink-0 text-stone" strokeWidth={1.75} aria-label="Logged in chat" />}
            {tx.source === "voice" && <AudioLines className="size-3.5 shrink-0 text-stone" strokeWidth={1.75} aria-label="Logged by voice" />}
          </div>
          <div className="truncate text-[13px] text-graphite">{sub}</div>
        </div>
        <div className="text-right">
          <Money minor={tx.amountMinor} currency={tx.currency} type={tx.type} className="text-[15px] font-medium" />
          {tx.currency !== baseCurrency && (
            <div className="text-[12px] text-graphite">
              <Money minor={tx.baseAmountMinor} currency={baseCurrency} className="text-graphite" />
            </div>
          )}
        </div>
      </button>
    </li>
  );
}
