import { cn } from "@/lib/cn";
import { formatMoney, formatSigned } from "@/lib/money";

/**
 * Money in ink. Income carries a "+" and a small lime marker, expense a real minus sign.
 * Colour is never the only signal.
 */
export function Money({
  minor,
  currency,
  type,
  compact,
  marker = true,
  className,
}: {
  minor: number;
  currency: string;
  type?: "income" | "expense" | "transfer";
  compact?: boolean;
  marker?: boolean;
  className?: string;
}) {
  const text = type ? formatSigned(minor, currency, type) : formatMoney(minor, currency, { compact });
  return (
    <span className={cn("tabular inline-flex items-center gap-1.5 whitespace-nowrap text-ink", type === "transfer" && "text-graphite", className)}>
      {type === "income" && marker && <span aria-hidden className="size-2 rounded-full bg-lime ring-1 ring-ink/15" />}
      {text}
    </span>
  );
}
