"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { LinkPending } from "@/components/ui/link-pending";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/app/pulse", label: "Overview", exact: true },
  { href: "/app/pulse/users", label: "Users" },
  { href: "/app/pulse/activity", label: "Activity" },
  { href: "/app/pulse/errors", label: "Errors" },
  { href: "/app/pulse/speed", label: "Speed" },
];

/** Section tabs for Pulse. The chosen time range follows you between tabs. */
export function PulseNav({ openIssues }: { openIssues: number }) {
  const pathname = usePathname();
  const range = useSearchParams().get("range");
  return (
    <nav aria-label="Pulse sections" className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:px-0">
      <div className="flex w-max gap-1 rounded-full bg-parchment p-1.5">
        {TABS.map((t) => {
          const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={range ? `${t.href}?range=${range}` : t.href}
              aria-current={active ? "page" : undefined}
              className={cn("inline-flex items-center gap-2 rounded-full px-4 py-2 text-[14px] whitespace-nowrap transition-colors", active ? "bg-ink text-white" : "hover:bg-white")}
            >
              {t.label}
              {t.label === "Errors" && openIssues > 0 && (
                <span className={cn("rounded-full px-1.5 text-[12px] leading-5 font-medium", active ? "bg-alert text-white" : "bg-alert/10 text-alert")}>{openIssues}</span>
              )}
              <LinkPending />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function RangeTabs({ current, basePath, extra }: { current: string; basePath: string; extra?: Record<string, string> }) {
  const ranges = [
    ["24h", "24h"],
    ["7d", "7 days"],
    ["30d", "30 days"],
    ["90d", "90 days"],
  ] as const;
  return (
    <div className="flex w-max gap-1 rounded-full border border-ash p-1">
      {ranges.map(([r, label]) => (
        <Link
          key={r}
          href={`${basePath}?${new URLSearchParams({ ...extra, range: r })}`}
          scroll={false}
          aria-current={r === current ? "page" : undefined}
          className={cn("rounded-full px-3.5 py-1.5 text-[13px] whitespace-nowrap transition-colors", r === current ? "bg-lime font-medium" : "hover:bg-parchment")}
        >
          {label}
          <LinkPending />
        </Link>
      ))}
    </div>
  );
}
