import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { CategoryIcon } from "@/components/ui/category-icon";
import { Money } from "@/components/ui/money";
import { cn } from "@/lib/cn";

/** The receipt for an entry FinAI wrote. Presentational only. */
export function ReceiptCard({
  status,
  type,
  amountMinor,
  currency,
  category,
  icon,
  meta,
  actions,
  muted,
  surface = "white",
  className,
}: {
  status: string;
  type: "income" | "expense" | "transfer";
  amountMinor: number;
  currency: string;
  category: string;
  icon?: string | null;
  meta?: string;
  actions?: ReactNode;
  muted?: boolean;
  surface?: "white" | "parchment";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[18px] border border-ash p-4",
        surface === "white" ? "bg-white" : "bg-parchment",
        muted && "opacity-55",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <span className="inline-flex size-5 items-center justify-center rounded-full bg-lime">
          <Check className="size-3" strokeWidth={2.5} aria-hidden />
        </span>
        <span className="eyebrow text-ink">{status}</span>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <CategoryIcon name={type === "transfer" ? "transfer" : icon} tone={surface === "white" ? "parchment" : "white"} />
        <div className="min-w-[4.5rem] flex-1">
          <div className="text-[16px] leading-tight font-medium">{category}</div>
          {meta && <div className="text-[13px] leading-snug text-graphite">{meta}</div>}
        </div>
        <Money minor={amountMinor} currency={currency} type={type} className={cn("text-[18px] font-medium", muted && "line-through")} />
      </div>
      {actions && <div className="mt-3 flex items-center gap-4 border-t border-ash pt-3">{actions}</div>}
    </div>
  );
}
