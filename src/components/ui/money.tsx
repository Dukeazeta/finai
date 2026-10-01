"use client";

import { useAmountHidden } from "@/components/app/app-context";
import type { HideGroup } from "@/lib/hide-groups";
import { cn } from "@/lib/cn";
import { formatMoney, formatSigned, maskMoney } from "@/lib/money";

/**
 * Money in ink. Income carries a "+" and a small lime marker, expense a real minus sign.
 * Colour is never the only signal. With a `group`, it masks to "₦••••" when that area is hidden.
 */
export function Money({
  minor,
  currency,
  type,
  compact,
  marker = true,
  group,
  className,
}: {
  minor: number;
  currency: string;
  type?: "income" | "expense" | "transfer";
  compact?: boolean;
  marker?: boolean;
  group?: HideGroup;
  className?: string;
}) {
  const hidden = useAmountHidden(group);
  const sign = type === "income" ? "+" : type === "expense" ? "−" : undefined;
  const text = hidden ? maskMoney(currency, sign) : type ? formatSigned(minor, currency, type) : formatMoney(minor, currency, { compact });
  return (
    <span
      className={cn("tabular inline-flex items-center gap-1.5 whitespace-nowrap text-ink", type === "transfer" && "text-graphite", className)}
      aria-label={hidden ? "Amount hidden" : undefined}
    >
      {type === "income" && marker && <span aria-hidden className="size-2 rounded-full bg-lime ring-1 ring-ink/15" />}
      {text}
    </span>
  );
}
