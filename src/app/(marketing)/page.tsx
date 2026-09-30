import { Banknote, CalendarClock, Check, Mic, NotebookPen, PieChart, Plus, ShieldCheck, Sparkles, Target } from "lucide-react";
import type { Metadata } from "next";
import { BudgetMeterView } from "@/components/app/budget-meter";
import { CountUp } from "@/components/marketing/count-up";
import { FeatureCarousel } from "@/components/marketing/feature-carousel";
import { HeroMockups, MiniCashflow } from "@/components/marketing/mockups";
import { PhraseStrip } from "@/components/marketing/phrase-strip";
import { ProductTabs } from "@/components/marketing/product-tabs";
import { ReceiptCard } from "@/components/receipt-card";
import { ArrowLink, LinkButton } from "@/components/ui/button";
import { Eyebrow, PillTag, Statement } from "@/components/ui/bits";

export const metadata: Metadata = {
  title: { absolute: "FinAI: a money tracker you can talk to" },
  description:
    "Tell FinAI what you spent and earned, by typing or talking, and it keeps your books, budgets and dashboard up to date. Free to use.",
};

const PILLARS = [
  {
    icon: NotebookPen,
    eyebrow: "Logging",
    title: "Say it once, it's written down",
    body: "One sentence becomes an entry with the right amount, category, account and date. No forms unless you want them.",
  },
  {
    icon: PieChart,
    eyebrow: "Visibility",
    title: "See where it all went",
    body: "Money in and out, sorted by category and account, updated the moment you log. Ask for any number you need.",
  },
  {
    icon: Target,
    eyebrow: "Budgets",
    title: "Know what's left to spend",
    body: "Monthly limits per category show what's left and how many days remain. Over budget? You'll see it plainly.",
  },
  {
    icon: CalendarClock,
    eyebrow: "Bills",
    title: "Nothing sneaks up on you",
    body: "Rent, subscriptions and salary lined up before they land. Mark one paid and FinAI logs it for you.",
  },
];

const PERSONAS = [
  {
    eyebrow: "Salary earners",
    title: "Payday to payday, in plain view",
    body: "See how much of this month's salary is left, which categories ate the most, and whether you're on track before the next one lands.",
    visual: (
      <div className="flex h-full flex-col justify-end gap-3 rounded-[18px] bg-charcoal p-6 text-white">
        <p className="text-[13px] text-ash">Left from September&apos;s salary</p>
        <p className="text-[56px] leading-none font-medium tracking-[-0.03em]">₦120,500</p>
        <MiniCashflow />
      </div>
    ),
  },
  {
    eyebrow: "Freelancers",
    title: "Dollars and naira in one set of books",
    body: "Log client payments in the currency they came in. FinAI counts them toward your naira totals at the day's rate, or at the rate you actually got.",
    visual: (
      <div className="flex h-full flex-col justify-end gap-3 rounded-[18px] bg-lime p-6">
        <ReceiptCard status="Logged" type="income" amountMinor={40000} currency="USD" category="Freelance" icon="laptop" meta="Upwork · Dollar account" />
        <ReceiptCard status="Logged" type="income" amountMinor={15000000} currency="NGN" category="Freelance" icon="laptop" meta="Logo project · GTBank" />
      </div>
    ),
  },
  {
    eyebrow: "Traders",
    title: "Sales logged while you serve",
    body: "Hands busy at the stall? Say the sale out loud. Voice mode logs it and answers back, so the day's takings are counted before you close.",
    visual: (
      <div className="flex h-full flex-col items-center justify-center gap-4 rounded-[18px] bg-white p-6 text-center">
        <span className="relative inline-flex size-24 items-center justify-center">
          <span className="absolute inset-0 rounded-full border border-ash" />
          <span className="absolute inset-3 rounded-full bg-lime" />
          <Mic className="relative size-6" strokeWidth={1.5} />
        </span>
        <p className="max-w-[26ch] text-[15px] text-graphite">&ldquo;Sold two bags of rice, one forty.&rdquo;</p>
        <ReceiptCard
          status="Logged"
          type="income"
          amountMinor={14000000}
          currency="NGN"
          category="Business"
          icon="store"
          surface="parchment"
          className="w-full max-w-[320px] text-left"
        />
      </div>
    ),
  },
  {
    eyebrow: "Students",
    title: "An allowance that lasts the month",
    body: "Set a small budget for food and transport, log as you go, and see exactly how many days your money has left in it.",
    visual: (
      <div className="flex h-full flex-col justify-center gap-5 rounded-[18px] bg-white p-6">
        <BudgetMeterView name="Food and drinks" icon="utensils" spentMinor={1860000} limitMinor={2500000} currency="NGN" daysLeft={11} />
        <BudgetMeterView name="Transport" icon="bus" spentMinor={640000} limitMinor={1000000} currency="NGN" daysLeft={11} />
        <BudgetMeterView name="Data and airtime" icon="smartphone" spentMinor={520000} limitMinor={500000} currency="NGN" />
      </div>
    ),
  },
];

const FAQ = [
  {
    q: "What is FinAI?",
    a: "A personal money tracker with an assistant built in. You tell it what you earned, spent or moved, and it writes the entries, sorts them into categories and keeps your dashboard, budgets and balances current. You can also add and edit everything by hand.",
  },
  {
    q: "Does it connect to my bank?",
    a: "No. FinAI never asks for bank logins and can't see or move your money. Everything in it comes from what you tell it, which also means it works the same for cash, mobile money and every bank.",
  },
  {
    q: "How does voice mode work?",
    a: "Tap the mic and talk. FinAI uses Gemini Live to listen and answer out loud, and anything it logs appears on screen as a receipt while you speak. If you can't talk, you can type in the same window.",
  },
  {
    q: "What if the AI gets something wrong?",
    a: "Every entry it makes shows up as a receipt with Edit and Undo. You can also say “undo that” or “change the last one to 5k”. Deleting always needs your confirmation.",
  },
  {
    q: "Can I use dollars or other currencies?",
    a: "Yes. Pick a main currency when you start, then log entries in naira, dollars, pounds, euros, cedis and more. FinAI converts them to your main currency at the day's market rate, or at a rate you enter.",
  },
  {
    q: "Is it really free?",
    a: "Yes. The free plan includes everything on this page. We're working on a Pro plan and will say what's in it when it's ready.",
  },
  {
    q: "Who can see my data?",
    a: "Only you, through your account. To understand your messages, the text or audio you send the assistant is processed by Google's Gemini API. You can export your transactions or delete your account and all its data from Settings.",
  },
];

const RESOURCES = [
  {
    title: "Talk instead of type",
    body: "Voice mode listens, answers out loud and logs what you mention. Works in your phone's browser.",
    link: { href: "/sign-up", label: "Try voice mode" },
    visual: (
      <div className="flex w-full items-center gap-4 px-5">
        <span className="relative inline-flex size-16 shrink-0 items-center justify-center">
          <span className="absolute inset-0 rounded-full border border-ash" />
          <span className="absolute inset-2 rounded-full bg-lime" />
          <Mic className="relative size-5" strokeWidth={1.5} />
        </span>
        <div className="min-w-0 text-left">
          <p className="eyebrow text-graphite">Listening</p>
          <p className="mt-1 text-[13px]">&ldquo;Keke to school, five hundred.&rdquo;</p>
          <p className="mt-1 text-[12px] text-graphite">Logged ₦500 on Transport.</p>
        </div>
      </div>
    ),
  },
  {
    title: "Your data stays yours",
    body: "No bank logins. Export to CSV any time, and delete everything from Settings in one step.",
    link: { href: "/privacy", label: "Read how" },
    visual: (
      <ul className="flex w-full flex-col gap-2 px-5 text-left text-[13px]">
        <li className="flex items-center justify-between gap-3 rounded-[12px] bg-parchment px-3 py-2.5">
          <span className="flex items-center gap-2">
            <ShieldCheck className="size-4" strokeWidth={1.5} aria-hidden />
            Bank login
          </span>
          <span className="eyebrow text-graphite">Never asked</span>
        </li>
        <li className="flex items-center justify-between gap-3 rounded-[12px] bg-parchment px-3 py-2.5">
          <span>Export transactions</span>
          <span className="rounded-full border border-ink px-2.5 py-0.5 text-[11px]">CSV</span>
        </li>
        <li className="flex items-center justify-between gap-3 rounded-[12px] bg-parchment px-3 py-2.5">
          <span>Delete account</span>
          <span className="text-[11px] text-alert">One step</span>
        </li>
      </ul>
    ),
  },
  {
    title: "Questions, answered",
    body: "How currencies work, what happens if the AI gets it wrong, and what's free.",
    link: { href: "#faq", label: "See the answers" },
    visual: (
      <div className="w-full px-5 text-left">
        <div className="flex items-center justify-between gap-3 text-[13px] font-medium">
          Can I use dollars?
          <span className="inline-flex size-6 items-center justify-center rounded-full bg-lime">
            <Plus className="size-3.5 rotate-45" strokeWidth={1.75} aria-hidden />
          </span>
        </div>
        <p className="mt-2 text-[12px] text-graphite">Yes. Log in any of 12 currencies and FinAI counts them in your main one at the day&apos;s rate.</p>
      </div>
    ),
  },
];

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="overflow-hidden bg-parchment pt-[128px] md:pt-[168px]">
        <div className="shell flex flex-col items-center text-center">
          <h1 style={{ ["--i" as string]: 0 }} className="hero-enter max-w-[16ch] text-[clamp(3rem,7vw,5rem)] leading-[0.9] font-medium tracking-[-0.03em]">
            Say what you spent. FinAI keeps the books.
          </h1>
          <ul style={{ ["--i" as string]: 1 }} className="hero-enter mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[14px] font-medium">
            <li className="flex items-center gap-1.5">
              <Check className="size-4" strokeWidth={2} aria-hidden />
              Free to use
            </li>
            <li className="flex items-center gap-1.5">
              <Banknote className="size-4" strokeWidth={1.75} aria-hidden />
              Any bank, card or wallet
            </li>
            <li className="flex items-center gap-1.5">
              <Sparkles className="size-4" strokeWidth={1.75} aria-hidden />
              Powered by Gemini
            </li>
          </ul>
          <div style={{ ["--i" as string]: 2 }} className="hero-enter mt-8 flex flex-wrap justify-center gap-2.5">
            <LinkButton href="/sign-up" chevron>
              Get started
            </LinkButton>
            <LinkButton href="#product" variant="outline" chevron>
              See how it works
            </LinkButton>
          </div>
        </div>
        <div className="shell hero-enter-product relative mt-12 md:mt-16">
          <p className="absolute -top-7 right-4 text-[12px] text-graphite md:right-8 xl:right-0">Example figures</p>
          <HeroMockups />
        </div>
        <PhraseStrip />
      </section>

      {/* One app */}
      <section id="product" className="scroll-mt-28 pt-24 md:pt-32">
        <div className="shell">
          <Statement
            title={
              <>
                One app. Every naira
                <br className="hidden sm:block" /> accounted for.
              </>
            }
            sub="Chat, voice and a live dashboard share one set of books, so whatever you log in one place shows up everywhere else."
          >
            <LinkButton href="/sign-up" chevron>
              Start tracking free
            </LinkButton>
          </Statement>
          <div data-reveal="rise" className="mt-14">
            <ProductTabs />
          </div>
          <div data-reveal="rise" style={{ ["--i" as string]: 1 }} className="mt-3 grid grid-cols-2 items-center gap-x-6 gap-y-5 rounded-[28px] bg-parchment px-6 py-6 sm:px-8 lg:grid-cols-[auto_auto_auto_1fr_auto] lg:gap-10">
            <Eyebrow className="col-span-2 lg:col-span-1">Example month</Eyebrow>
            <div className="lg:border-l lg:border-ash lg:pl-10">
              <CountUp to={41} className="block text-[36px] leading-none font-medium tracking-[-0.03em]" />
              <p className="mt-1 text-[12px] text-graphite">entries, each said in a sentence</p>
            </div>
            <div className="lg:border-l lg:border-ash lg:pl-10">
              <CountUp to={120.5} decimals={1} prefix="₦" suffix="K" className="block text-[36px] leading-none font-medium tracking-[-0.03em]" />
              <p className="mt-1 text-[12px] text-graphite">left over, tracked to the kobo</p>
            </div>
            <p className="col-span-2 text-[15px] font-medium lg:col-span-1">
              &ldquo;Spent 4.5k on suya with my Opay card.&rdquo;
              <span className="mt-1 block text-[13px] font-normal text-graphite">Logged as Food and drinks, ₦4,500, Opay, today.</span>
            </p>
            <ArrowLink href="/sign-up" className="col-span-2 lg:col-span-1">
              Try it free
            </ArrowLink>
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="pt-24 md:pt-32">
        <div className="shell">
          <Statement
            title={
              <>
                ₦4,500 logged
                <br className="hidden sm:block" /> in six words.
              </>
            }
            sub="When writing it down takes no effort, the numbers stay honest all month."
          >
            <LinkButton href="/sign-up" chevron>
              Open your books
            </LinkButton>
          </Statement>
          <div className="mt-14 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {PILLARS.map((p, i) => (
              <div key={p.eyebrow} data-reveal="rise" style={{ ["--i" as string]: i }} className="flex flex-col rounded-[28px] bg-parchment p-6 sm:p-7">
                <p.icon className="size-6" strokeWidth={1.5} aria-hidden />
                <Eyebrow className="mt-8">{p.eyebrow}</Eyebrow>
                <h3 className="mt-2 text-[22px] leading-[1.18] font-medium">{p.title}</h3>
                <p className="mt-3 text-[14px] text-graphite">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Assistant carousel */}
      <section id="assistant" className="scroll-mt-28 pt-24 md:pt-32">
        <div className="shell">
          <Statement
            title={
              <>
                Every entry sorted.
                <br className="hidden sm:block" /> None of it by you.
              </>
            }
            sub="FinAI picks the category, the account and the date from what you said, answers from your own entries, and checks with you before deleting anything."
          />
        </div>
        <div data-reveal="rise" className="mt-14">
          <FeatureCarousel />
        </div>
      </section>

      {/* Personas */}
      <section id="for-you" className="scroll-mt-28 pt-24 md:pt-32">
        <div className="shell">
          <Statement
            title={
              <>
                Built for however
                <br className="hidden sm:block" /> you earn.
              </>
            }
            sub="Salary, side hustle or shop till, FinAI keeps the same honest books."
          />
          <div className="mt-14 flex flex-col gap-3">
            {PERSONAS.map((p, i) => (
              <article
                key={p.eyebrow}
                data-reveal="rise"
                className="grid grid-cols-1 gap-6 rounded-[28px] border border-white bg-parchment p-6 sm:p-8 lg:sticky lg:grid-cols-[0.75fr_1fr] lg:gap-10"
                style={{ top: `${120 + i * 16}px` }}
              >
                <div className="flex flex-col">
                  <Eyebrow>{p.eyebrow}</Eyebrow>
                  <div className="mt-auto pt-10">
                    <h3 className="text-[28px] leading-[1.14] font-medium tracking-[-0.03em]">{p.title}</h3>
                    <p className="mt-3 max-w-[42ch] text-[14px] text-graphite">{p.body}</p>
                    <ArrowLink href="/sign-up" className="mt-5">
                      Start free
                    </ArrowLink>
                  </div>
                </div>
                <div className="min-h-[300px] lg:min-h-[340px]">{p.visual}</div>
              </article>
            ))}
          </div>
          <p className="mt-4 text-center text-[12px] text-graphite">Figures shown are examples.</p>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-28 pt-24 md:pt-32">
        <div className="shell">
          <Statement title="Free while you build the habit." sub="Everything on this page is on the free plan. Pro is on the way." />
          <div className="mt-14 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div data-reveal="rise" className="flex flex-col rounded-[28px] bg-lime p-7 sm:p-10">
              <Eyebrow className="text-ink">Free</Eyebrow>
              <p className="mt-6 text-[90px] leading-[0.89] font-medium tracking-[-0.03em]">₦0</p>
              <p className="mt-3 text-[16px]">Every feature FinAI has today.</p>
              <ul className="mt-8 flex flex-col gap-3 border-t border-ink/20 pt-6 text-[15px]">
                {["Chat and voice logging", "Dashboard, budgets and bills", "Unlimited accounts and entries", "Naira, dollars and ten other currencies", "CSV export any time"].map((f) => (
                  <li key={f} className="flex gap-2.5">
                    <Check className="mt-0.5 size-4 shrink-0" strokeWidth={2} aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>
              <LinkButton href="/sign-up" variant="dark" size="lg" chevron className="mt-10 self-start">
                Get started free
              </LinkButton>
            </div>
            <div data-reveal="rise" style={{ ["--i" as string]: 1 }} className="flex flex-col rounded-[28px] bg-parchment p-7 sm:p-10">
              <div className="flex items-center gap-3">
                <Eyebrow>Pro</Eyebrow>
                <PillTag>Coming soon</PillTag>
              </div>
              <p className="mt-6 text-[60px] leading-none font-medium tracking-[-0.03em] text-graphite">Soon</p>
              <p className="mt-3 max-w-[36ch] text-[16px]">
                We&apos;re still building it. When it&apos;s ready we&apos;ll share what it includes and what it costs.
              </p>
              <span className="mt-auto pt-10 text-[14px] text-graphite">Nothing to pay today.</span>
            </div>
          </div>
        </div>
      </section>

      {/* Resources */}
      <section className="pt-24 md:pt-32">
        <div className="shell">
          <Statement title="Let's open your books" sub="A few things worth knowing before you start." />
          <div className="mt-14 grid grid-cols-1 gap-3 md:grid-cols-3">
            {RESOURCES.map((r, i) => (
              <div key={r.title} data-reveal="rise" style={{ ["--i" as string]: i }} className="flex flex-col rounded-[28px] bg-parchment p-6 sm:p-8">
                <h3 className="min-h-[2.36em] text-[22px] leading-[1.18] font-medium">{r.title}</h3>
                <div className="my-8 flex h-40 items-center justify-center rounded-[18px] bg-white">{r.visual}</div>
                <p className="text-[14px] text-graphite">{r.body}</p>
                <ArrowLink href={r.link.href} className="mt-5">
                  {r.link.label}
                </ArrowLink>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dark island */}
      <section className="pt-3">
        <div className="shell">
          <div data-reveal="rise" className="flex flex-col items-center rounded-[28px] bg-charcoal px-6 py-16 text-center text-white sm:py-24">
            <PillTag dark>Powered by Gemini</PillTag>
            <p className="mt-8 max-w-[18ch] text-[clamp(2.25rem,5.5vw,3.75rem)] leading-[1] font-medium tracking-[-0.03em]">
              You do the living. FinAI does the bookkeeping.
            </p>
            <LinkButton href="/sign-up" chevron className="mt-10">
              Switch to FinAI
            </LinkButton>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-28 py-24 md:py-32">
        <div className="shell grid grid-cols-1 gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <h2 data-reveal="line" className="text-[clamp(2.5rem,6vw,3.75rem)] leading-[1] font-medium tracking-[-0.03em]">Good to know</h2>
          </div>
          <div className="flex flex-col gap-3">
            {FAQ.map((f, i) => (
              <details key={f.q} data-reveal="rise" style={{ ["--i" as string]: i }} className="group rounded-[28px] bg-parchment px-6 sm:px-8">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 text-[18px] font-medium [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-ink transition-colors group-open:border-lime group-open:bg-lime">
                    <Plus className="size-4 transition-transform duration-200 group-open:rotate-45" strokeWidth={1.75} aria-hidden />
                  </span>
                </summary>
                <p className="max-w-[62ch] pb-7 text-[15px] text-graphite">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
