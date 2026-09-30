import { Activity, CalendarClock, ChevronRight, Settings, Shapes, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/app/page-header";
import { LinkPending } from "@/components/ui/link-pending";
import { isPulseAdmin } from "@/server/pulse/admin";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "More" };

const LINKS = [
  { href: "/app/accounts", label: "Accounts", sub: "Balances and where money sits", icon: Wallet },
  { href: "/app/recurring", label: "Bills and repeats", sub: "Rent, subscriptions, salary", icon: CalendarClock },
  { href: "/app/categories", label: "Categories", sub: "How entries are sorted", icon: Shapes },
  { href: "/app/settings", label: "Settings", sub: "Profile, currency, sign in", icon: Settings },
];

const PULSE = { href: "/app/pulse", label: "Pulse", sub: "Visitors, users, errors and speed", icon: Activity };

export default async function MorePage() {
  const { user } = await requireUser();
  const links = isPulseAdmin(user.email) ? [...LINKS, PULSE] : LINKS;
  return (
    <div className="flex flex-col gap-6 px-4 pt-4 md:px-8">
      <PageHeader title="More" />
      <ul className="flex flex-col gap-3">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="flex items-center gap-4 rounded-[28px] bg-parchment px-5 py-5 hover:bg-[#ededdf]">
              <span className="inline-flex size-11 items-center justify-center rounded-full bg-white">
                <l.icon className="size-5" strokeWidth={1.5} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[17px] font-medium">{l.label}</div>
                <div className="text-[14px] text-graphite">{l.sub}</div>
              </div>
              <ChevronRight className="size-5" strokeWidth={1.75} aria-hidden />
              <LinkPending />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
