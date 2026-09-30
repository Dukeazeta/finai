"use client";

import {
  Activity,
  CalendarClock,
  House,
  LogOut,
  Menu,
  MessageCircle,
  Mic,
  PiggyBank,
  Plus,
  ReceiptText,
  Settings,
  Shapes,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { LinkPending } from "@/components/ui/link-pending";
import { VoiceOverlay } from "@/components/voice/voice-overlay";
import { dropVoiceToken, prefetchVoice } from "@/components/voice/voice-prefetch";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/cn";
import { useApp } from "./app-context";
import { AskPanel } from "./ask-panel";
import { TransactionFormSheet } from "./transaction-form";

type NavItem = { href: string; label: string; icon: LucideIcon; exact?: boolean };

const PRIMARY: NavItem[] = [
  { href: "/app", label: "Dashboard", icon: House, exact: true },
  { href: "/app/chat", label: "Chat", icon: MessageCircle },
  { href: "/app/transactions", label: "Transactions", icon: ReceiptText },
  { href: "/app/budgets", label: "Budgets", icon: PiggyBank },
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

const PULSE: NavItem = { href: "/app/pulse", label: "Pulse", icon: Activity };
const MORE: NavItem = { href: "/app/more", label: "More", icon: Menu };
const MOBILE: NavItem[] = [PRIMARY[0], PRIMARY[2], PRIMARY[1], PRIMARY[3], MORE];

function NavLink({ item, pathname, onGo }: { item: NavItem; pathname: string; onGo: (href: string) => void }) {
  const active = isActive(pathname, item);
  return (
    <Link
      href={item.href}
      onClick={() => onGo(item.href)}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-11 items-center gap-3 rounded-full px-4 text-[15px] transition-colors",
        active ? "bg-lime font-medium" : "text-ink hover:bg-parchment",
      )}
    >
      <item.icon className="size-[18px]" strokeWidth={1.5} aria-hidden />
      {item.label}
      <LinkPending />
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const realPath = usePathname();
  const router = useRouter();
  // The tapped tab lights up at once; the real path takes over when the page lands.
  const [going, setGoing] = useState<{ from: string; to: string } | null>(null);
  const pathname = going && going.from === realPath ? going.to : realPath;
  const onGo = (href: string) => href !== realPath && setGoing({ from: realPath, to: href });
  const { user, accounts, categories, pulseAdmin, openTxForm, setAskOpen, setVoiceOpen } = useApp();
  const secondary = pulseAdmin ? [...SECONDARY, PULSE] : SECONDARY;
  const onChat = realPath.startsWith("/app/chat");

  // Voice tokens carry the account and category lists, so mint a fresh one whenever those change.
  const voiceKey = [...accounts, ...categories].map((x) => `${x.id}:${x.name}`).join("|");
  useEffect(() => {
    dropVoiceToken();
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1500));
    const cancel = window.cancelIdleCallback ?? window.clearTimeout;
    const id = idle(() => prefetchVoice(), { timeout: 3000 });
    return () => cancel(id);
  }, [voiceKey]);

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
            <NavLink key={item.href} item={item} pathname={pathname} onGo={onGo} />
          ))}
          <p className="eyebrow mt-6 mb-2 px-4 text-graphite">Manage</p>
          {secondary.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} onGo={onGo} />
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
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 rounded-t-[28px] bg-white/95 px-4 backdrop-blur-sm md:h-[72px] md:px-8">
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
            onPointerEnter={prefetchVoice}
            onFocus={prefetchVoice}
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
        <nav
          aria-label="Main"
          className="fixed inset-x-3 bottom-3 z-30 flex h-[68px] items-center justify-around rounded-full border border-ash bg-white px-2 pb-[env(safe-area-inset-bottom)] md:hidden"
        >
          {MOBILE.map((item) => {
            const active = item === MORE ? [...secondary, PRIMARY[4], MORE].some((s) => isActive(pathname, s)) : isActive(pathname, item);
            const isChat = item.href === "/app/chat";
            const label = isChat ? "Ask FinAI" : item.label;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => onGo(item.href)}
                aria-current={active ? "page" : undefined}
                aria-label={label}
                title={label}
                className="flex h-full flex-1 items-center justify-center"
              >
                {isChat ? (
                  <span className="inline-flex size-12 items-center justify-center rounded-full bg-ink text-lime transition-transform active:scale-95">
                    <item.icon className="size-6" strokeWidth={1.75} aria-hidden />
                  </span>
                ) : (
                  <span
                    className={cn(
                      "inline-flex h-11 w-14 items-center justify-center rounded-full transition-colors duration-200",
                      active ? "bg-lime" : "text-graphite",
                    )}
                  >
                    <item.icon className="size-6" strokeWidth={active ? 2 : 1.6} aria-hidden />
                  </span>
                )}
                <LinkPending />
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
