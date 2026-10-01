"use client";

import { useAmountHidden } from "@/components/app/app-context";
import type { HideGroup } from "@/lib/hide-groups";
import { maskMoney } from "@/lib/money";

/** For amounts already formatted on the server: shows them, or "₦••••" when their area is hidden. */
export function Amount({ group, currency, children }: { group: HideGroup; currency: string; children: string }) {
  const hidden = useAmountHidden(group);
  if (!hidden) return children;
  const sign = children.startsWith("−") ? "−" : children.startsWith("+") ? "+" : undefined;
  return <span aria-label="Amount hidden">{maskMoney(currency, sign)}</span>;
}
