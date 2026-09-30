"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/logo";
import { LinkButton } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "/#product", label: "Product" },
  { href: "/#assistant", label: "Assistant" },
  { href: "/#for-you", label: "Who it's for" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
];

/** Perk's floating parchment pill: fully rounded, 80px tall, inset from the viewport edge. */
export function SiteNav({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 md:px-[30px] md:pt-6">
      <div
        className={cn(
          "mx-auto flex h-16 max-w-[1380px] items-center gap-6 rounded-full bg-parchment px-6 transition-[border-color] duration-200 md:h-20 md:px-8",
          "border",
          scrolled ? "border-ash" : "border-transparent",
        )}
      >
        <Logo />
        <nav aria-label="Main" className="mx-auto hidden items-center gap-8 lg:flex">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="text-[14px] font-medium text-ink hover:underline">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-2.5 sm:flex lg:ml-0">
          {signedIn ? (
            <LinkButton href="/app" chevron>
              Open FinAI
            </LinkButton>
          ) : (
            <>
              <LinkButton href="/sign-up" chevron>
                Get started
              </LinkButton>
              <LinkButton href="/sign-in" variant="outline" chevron>
                Log in
              </LinkButton>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          className="ml-auto inline-flex size-10 items-center justify-center rounded-full text-ink hover:bg-white sm:ml-0 lg:hidden"
        >
          {open ? <X className="size-5" strokeWidth={1.75} /> : <Menu className="size-5" strokeWidth={1.75} />}
        </button>
      </div>
      {open && (
        <nav id="mobile-nav" aria-label="Mobile" className="mx-auto mt-2 flex max-w-[1380px] flex-col rounded-[28px] border border-ash bg-parchment p-5 lg:hidden">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="border-b border-ash py-3.5 text-[18px] font-medium last:border-0">
              {l.label}
            </Link>
          ))}
          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:hidden">
            {signedIn ? (
              <LinkButton href="/app" className="col-span-2" chevron>
                Open FinAI
              </LinkButton>
            ) : (
              <>
                <LinkButton href="/sign-up" chevron>
                  Get started
                </LinkButton>
                <LinkButton href="/sign-in" variant="outline" chevron>
                  Log in
                </LinkButton>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
