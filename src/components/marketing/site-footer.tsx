import Link from "next/link";
import { Logo } from "@/components/logo";
import { LinkButton } from "@/components/ui/button";

const COLS = [
  {
    title: "Product",
    links: [
      { href: "/#product", label: "Chat, voice and dashboard" },
      { href: "/#assistant", label: "The assistant" },
      { href: "/#for-you", label: "Who it's for" },
      { href: "/#pricing", label: "Pricing" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/sign-up", label: "Get started" },
      { href: "/sign-in", label: "Log in" },
      { href: "/forgot-password", label: "Reset password" },
    ],
  },
  {
    title: "Help",
    links: [
      { href: "/#faq", label: "Questions" },
      { href: "/privacy", label: "Your data" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
];

/** perk.com's footer: a lime block with a help row, link columns and an oversized cropped phrase, then a white fine-print strip. */
export function SiteFooter() {
  return (
    <footer className="px-3 pb-6 md:px-[30px]">
      <div className="@container mx-auto max-w-[1380px] overflow-hidden rounded-[28px] bg-lime">
        <div className="shell pt-12 md:pt-16">
          <div className="flex flex-col gap-6 border-b border-ink/25 pb-8 md:flex-row md:items-center">
            <p className="text-[22px] leading-[1.18] font-medium">
              How can we
              <br className="hidden md:block" /> help?
            </p>
            <div className="flex flex-wrap gap-x-8 gap-y-2 text-[15px] font-medium md:ml-16">
              <Link href="/#faq" className="hover:underline">
                Questions
              </Link>
              <Link href="/privacy" className="hover:underline">
                Privacy
              </Link>
              <Link href="/terms" className="hover:underline">
                Terms
              </Link>
            </div>
            <LinkButton href="/sign-up" variant="dark" chevron className="md:ml-auto">
              Get started
            </LinkButton>
          </div>
          <div className="grid grid-cols-2 gap-8 py-10 md:grid-cols-4">
            {COLS.map((c) => (
              <div key={c.title}>
                <h2 className="text-[14px] text-ink/60">{c.title}</h2>
                <ul className="mt-3 flex flex-col gap-2.5">
                  {c.links.map((l) => (
                    <li key={l.label}>
                      <Link href={l.href} className="text-[15px] font-medium hover:underline">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <p
          aria-hidden
          data-reveal="lift"
          className="px-[4cqi] pt-[2cqi] pb-[5cqi] text-center text-[16cqi] leading-none font-medium tracking-[-0.05em] whitespace-nowrap select-none"
        >
          Say it. Sorted.
        </p>
      </div>

      <div className="shell grid grid-cols-1 gap-8 pt-10 md:grid-cols-[1fr_2fr]">
        <div>
          <Logo />
          <p className="mt-4 text-[14px]">© {new Date().getFullYear()} FinAI</p>
        </div>
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap gap-x-8 gap-y-2 text-[14px] font-medium">
            <Link href="/privacy" className="hover:underline">
              Privacy
            </Link>
            <Link href="/terms" className="hover:underline">
              Terms
            </Link>
          </div>
          <p className="text-[12px] leading-[1.5] text-graphite">
            FinAI is a record keeping tool. It is not a bank, it does not hold or move money, and it does not give licensed
            financial advice. What you type or say to the assistant is processed by Google&apos;s Gemini models so it can be understood.
          </p>
        </div>
      </div>
    </footer>
  );
}
