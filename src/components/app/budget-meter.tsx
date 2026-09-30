import { AlertTriangle } from "lucide-react";
import { CategoryIcon } from "@/components/ui/category-icon";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/money";

/** Spend against a monthly limit. Ink fill on a parchment track; over budget switches to alert with an icon and words. */
export function BudgetMeterView({
  name,
  icon,
  spentMinor,
  limitMinor,
  currency,
  daysLeft,
  iconTone = "parchment",
}: {
  name: string;
  icon: string;
  spentMinor: number;
  limitMinor: number;
  currency: string;
  daysLeft?: number;
  iconTone?: "parchment" | "white";
}) {
  const ratio = limitMinor > 0 ? spentMinor / limitMinor : 0;
  const over = ratio > 1;
  const left = limitMinor - spentMinor;

  return (
    <div className="flex items-center gap-3">
      <CategoryIcon name={icon} size="sm" tone={iconTone} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3 text-[14px]">
          <span className="min-w-0 font-medium">{name}</span>
          <span className="tabular shrink-0 text-graphite">
            {formatMoney(spentMinor, currency)} / {formatMoney(limitMinor, currency)}
          </span>
        </div>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-parchment ring-1 ring-ash ring-inset"
          role="meter"
          aria-valuemin={0}
          aria-valuemax={limitMinor}
          aria-valuenow={Math.min(spentMinor, limitMinor)}
          aria-label={`${name} budget`}
        >
          <div className={cn("grow-x h-full rounded-full transition-[width] duration-500", over ? "bg-alert" : ratio >= 0.85 ? "bg-charcoal" : "bg-ink")} style={{ width: `${Math.min(ratio, 1) * 100}%` }} />
        </div>
        <div className={cn("mt-1.5 flex items-center gap-1 text-[12px]", over ? "text-alert" : "text-graphite")}>
          {over && <AlertTriangle className="size-3.5" strokeWidth={1.75} aria-hidden />}
          {over
            ? `Over by ${formatMoney(-left, currency)}`
            : `${formatMoney(left, currency)} left${daysLeft == null ? "" : daysLeft === 0 ? " · last day of the month" : ` · ${daysLeft} ${daysLeft === 1 ? "day" : "days"} to go`}`}
        </div>
      </div>
    </div>
  );
}
