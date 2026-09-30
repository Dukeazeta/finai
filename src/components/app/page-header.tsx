import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { PERIOD_LABELS, type Period } from "@/lib/dates";

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[clamp(2.5rem,5vw,3.75rem)] leading-[1] font-medium tracking-[-0.03em]">{title}</h1>
        {description && <p className="mt-3 text-[16px] text-graphite">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function PeriodTabs({ current, basePath, extra }: { current: Period; basePath: string; extra?: Record<string, string> }) {
  const periods: Period[] = ["this_month", "last_month", "last_30_days", "this_year", "all_time"];
  return (
    <nav aria-label="Period" className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:px-0">
      <div className="flex w-max gap-1 rounded-full bg-parchment p-1.5">
        {periods.map((p) => {
          const qs = new URLSearchParams({ ...extra, period: p }).toString();
          return (
            <Link
              key={p}
              href={`${basePath}?${qs}`}
              scroll={false}
              aria-current={p === current ? "page" : undefined}
              className={cn("rounded-full px-4 py-2 text-[14px] whitespace-nowrap transition-colors", p === current ? "bg-lime font-medium" : "hover:bg-white")}
            >
              {PERIOD_LABELS[p]}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/** Parchment card, Perk's default container inside the white app panel. */
export function Panel({
  title,
  eyebrow,
  action,
  children,
  className,
  tone = "parchment",
}: {
  title?: string;
  eyebrow?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  tone?: "parchment" | "white" | "dark" | "lime";
}) {
  return (
    <section
      className={cn(
        "rounded-[28px] p-6 sm:p-8",
        tone === "parchment" && "bg-parchment",
        tone === "white" && "border border-ash bg-white",
        tone === "dark" && "bg-charcoal text-white",
        tone === "lime" && "bg-lime",
        className,
      )}
    >
      {(title || action || eyebrow) && (
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            {eyebrow && <p className={cn("eyebrow mb-1.5", tone === "dark" ? "text-ash" : "text-graphite")}>{eyebrow}</p>}
            {title && <h2 className="text-[22px] leading-[1.18] font-medium">{title}</h2>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function parsePeriod(v: string | string[] | undefined): Period {
  const s = Array.isArray(v) ? v[0] : v;
  return s && ["this_month", "last_month", "last_30_days", "this_year", "all_time"].includes(s) ? (s as Period) : "this_month";
}

export function EmptyState({ title, body, action }: { title: string; body: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-[28px] bg-parchment px-6 py-16 text-center">
      <p className="text-[28px] leading-[1.14] font-medium tracking-[-0.03em]">{title}</p>
      <p className="mt-3 max-w-[44ch] text-[15px] text-graphite">{body}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
