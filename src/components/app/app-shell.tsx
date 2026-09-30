"use client";

import {
  ArrowLeftRight,
  CalendarClock,
  LayoutGrid,
  LogOut,
  MessageCircle,
  Mic,
  MoreHorizontal,
  Plus,
  Settings,
  Shapes,
  Target,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { VoiceOverlay } from "@/components/voice/voice-overlay";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/cn";
import { useApp } from "./app-context";
import { AskPanel } from "./ask-panel";
import { TransactionFormSheet } from "./transaction-form";

type NavItem = { href: string; label: string; icon: LucideIcon; exact?: boolean };

const PRIMARY: NavItem[] = [
  { href: "/app", label: "Dashboard", icon: LayoutGrid, exact: true },
  { href: "/app/chat", label: "Chat", icon: MessageCircle },
  { href: "/app/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/app/budgets", label: "Budgets", icon: Target },
  { href: "/app/accounts", label: "Accounts", icon: Wallet },
];

const SECONDARY: NavItem[] = [
  { href: "/app/recurring", label: "Bills", icon: CalendarClock },
  { href: "/app/categories", label: "Categories", icon: Shapes },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

function isActive(pathname: string, item: NavItem) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item);
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-11 items-center gap-3 rounded-full px-4 text-[15px] transition-colors",
        active ? "bg-lime font-medium" : "text-ink hover:bg-parchment",
      )}
    >
      <item.icon className="size-[18px]" strokeWidth={1.5} aria-hidden />
      {item.label}
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, openTxForm, setAskOpen, setVoiceOpen } = useApp();
  const onChat = pathname.startsWith("/app/chat");

  async function signOut() {
    await authClient.signOut();
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="min-h-dvh bg-parchment p-2 md:grid md:grid-cols-[256px_minmax(0,1fr)] md:gap-3 md:p-3">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-white">
        Skip to content
      </a>

      <aside className="sticky top-3 hidden h-[calc(100dvh-24px)] flex-col rounded-[28px] bg-white p-4 md:flex">
        <div className="px-3 pt-2 pb-6">
          <Logo href="/app" />
        </div>
        <nav aria-label="Main" className="flex flex-col gap-1">
          {PRIMARY.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
          <p className="eyebrow mt-6 mb-2 px-4 text-graphite">Manage</p>
          {SECONDARY.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </nav>
        <div className="mt-auto flex items-center gap-3 rounded-[18px] bg-parchment p-3">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-lime text-[14px] font-medium">
            {(user.name || user.email).slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14px] font-medium">{user.name || "You"}</div>
            <div className="truncate text-[12px] text-graphite">{user.email}</div>
          </div>
          <button type="button" onClick={signOut} className="inline-flex size-8 items-center justify-center rounded-full hover:bg-white" aria-label="Log out" title="Log out">
            <LogOut className="size-4" strokeWidth={1.75} />
          </button>
        </div>
      </aside>

      <div className={cn("flex min-w-0 flex-col rounded-[28px] bg-white", onChat ? "h-[calc(100dvh-16px)] md:h-[calc(100dvh-24px)]" : "min-h-[calc(100dvh-16px)] md:min-h-[calc(100dvh-24px)]")}>
        <header className="sticky top-0 z-30 flex h-[72px] shrink-0 items-center gap-2 rounded-t-[28px] bg-white/95 px-4 backdrop-blur-sm md:px-8">
          <Logo href="/app" className="md:hidden" />
          <div className="flex-1" />
          {!onChat && (
            <button
              type="button"
              onClick={() => setAskOpen(true)}
              className="hidden h-10 items-center gap-2 rounded-full border border-ash px-4 text-[14px] transition-colors hover:border-ink sm:inline-flex"
            >
              <MessageCircle className="size-4" strokeWidth={1.75} aria-hidden />
              Ask FinAI
            </button>
          )}
          <button
            type="button"
            onClick={() => setVoiceOpen(true)}
            className="inline-flex size-10 items-center justify-center rounded-full border border-ash transition-colors hover:border-ink"
            aria-label="Talk to FinAI"
          >
            <Mic className="size-[18px]" strokeWidth={1.75} />
          </button>
          <Button onClick={() => openTxForm()} className="px-3.5 sm:px-4">
            <Plus className="size-[18px]" strokeWidth={1.75} aria-hidden />
            <span className="hidden sm:inline">Add entry</span>
            <span className="sr-only sm:hidden">Add entry</span>
          </Button>
        </header>

        <main id="main" className={cn("min-h-0 flex-1", !onChat && "pb-28 md:pb-10")}>
          {children}
        </main>
      </div>

      {!onChat && (
        <nav aria-label="Main" className="fixed inset-x-2 bottom-2 z-30 grid grid-cols-5 rounded-[28px] border border-ash bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
          {[PRIMARY[0], PRIMARY[2], PRIMARY[1], PRIMARY[3], { href: "/app/more", label: "More", icon: MoreHorizontal } as NavItem].map((item) => {
            const active =
              item.href === "/app/more" ? [...SECONDARY, PRIMARY[4]].some((s) => isActive(pathname, s)) || pathname === "/app/more" : isActive(pathname, item);
            const isChat = item.href === "/app/chat";
            return (
              <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className="flex h-16 flex-col items-center justify-center gap-1 text-[11px]">
                <span className={cn("inline-flex h-7 w-12 items-center justify-center rounded-full", (active || isChat) && "bg-lime")}>
                  <item.icon className="size-5" strokeWidth={1.5} aria-hidden />
                </span>
                <span className={cn(active && "font-medium")}>{isChat ? "Ask" : item.label}</span>
              </Link>
            );
          })}
        </nav>
      )}

      <TransactionFormSheet />
      <AskPanel />
      <VoiceOverlay />
    </div>
  );
}
