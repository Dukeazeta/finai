"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { BudgetMeterView } from "@/components/app/budget-meter";
import { PillTag } from "@/components/ui/bits";
import { CategoryIcon } from "@/components/ui/category-icon";
import { cn } from "@/lib/cn";

type Feature = { tag: string; title: string; body: string; visual: ReactNode };

function Chips({ items }: { items: [string, string][] }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map(([say, becomes]) => (
        <li key={say} className="flex items-center justify-between gap-3 rounded-[12px] bg-parchment px-3 py-2 text-[13px]">
          <span>&ldquo;{say}&rdquo;</span>
          <span className="tabular shrink-0 font-medium">{becomes}</span>
        </li>
      ))}
    </ul>
  );
}

const FEATURES: Feature[] = [
  {
    tag: "Shorthand",
    title: "Speaks the way you do",
    body: "4.5k, 2m, “yesterday”, “my GTB card”. FinAI turns shorthand into exact amounts, dates and accounts.",
    visual: <Chips items={[["4.5k", "₦4,500"], ["2.3m", "₦2,300,000"], ["last Friday", "26 Sep"], ["my GTB card", "GTBank"]]} />,
  },
  {
    tag: "Undo",
    title: "Nothing written in stone",
    body: "Every entry comes back as a receipt with Edit and Undo. Say “undo that” and it's gone. Deleting always asks first.",
    visual: (
      <div className="flex flex-col gap-2 text-[13px]">
        <div className="ml-auto rounded-[14px] rounded-br-[4px] bg-parchment px-3 py-2">Undo that, it was 3k not 30k</div>
        <p className="text-graphite">Changed Transport from ₦30,000 to ₦3,000.</p>
      </div>
    ),
  },
  {
    tag: "Currencies",
    title: "Dollars count too",
    body: "Log in naira, dollars, pounds, euros, cedis and more. Totals convert to your main currency at the day's rate, or yours.",
    visual: <Chips items={[["Upwork paid me $400", "+$400"], ["£25 Spotify gift", "+£25"], ["Counted in naira", "day's rate"]]} />,
  },
  {
    tag: "Budgets",
    title: "Know what's left",
    body: "Give any category a monthly limit. Ask “how's my food budget?” and get the number, with days to go.",
    visual: (
      <div className="flex flex-col gap-4">
        <BudgetMeterView name="Food and drinks" icon="utensils" spentMinor={4830000} limitMinor={6000000} currency="NGN" daysLeft={9} />
        <BudgetMeterView name="Transport" icon="bus" spentMinor={2140000} limitMinor={2000000} currency="NGN" />
      </div>
    ),
  },
  {
    tag: "Questions",
    title: "Answers from your own books",
    body: "Ask how much went on data, what you earned in August, or your biggest spend this week. It adds up your entries, never guesses.",
    visual: (
      <div className="flex flex-col gap-2 text-[13px]">
        <div className="ml-auto rounded-[14px] rounded-br-[4px] bg-parchment px-3 py-2">What did I spend most on this week?</div>
        <p>Food and drinks, ₦21,800 over 7 entries.</p>
      </div>
    ),
  },
  {
    tag: "Bills",
    title: "Nothing sneaks up",
    body: "Track rent, DSTV, subscriptions and salary. See what's due, then mark it paid and FinAI logs it for you.",
    visual: (
      <ul className="flex flex-col gap-2 text-[13px]">
        {[
          ["house", "Rent", "In 4 days"],
          ["repeat", "DSTV", "In 9 days"],
          ["briefcase", "Salary", "In 12 days"],
        ].map(([i, n, d]) => (
          <li key={n} className="flex items-center gap-2.5">
            <CategoryIcon name={i} size="sm" />
            <span className="flex-1">{n}</span>
            <span className="text-graphite">{d}</span>
          </li>
        ))}
      </ul>
    ),
  },
];

/** perk.com's AI features carousel: large cards, pill tag, mini UI, active card outlined in lime. */
export function FeatureCarousel() {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const go = useCallback((i: number) => {
    const el = track.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(FEATURES.length - 1, i));
    const card = el.children[clamped] as HTMLElement | undefined;
    if (card) el.scrollTo({ left: card.offsetLeft - (el.children[0] as HTMLElement).offsetLeft, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const onScroll = () => {
      const w = (el.children[0] as HTMLElement | undefined)?.offsetWidth ?? 1;
      setIndex(Math.round(el.scrollLeft / (w + 16)));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div>
      <div
        ref={track}
        className="flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto scroll-smooth px-4 pb-2 [scrollbar-width:none] md:scroll-px-[max(32px,calc((100vw-1200px)/2))] md:px-[max(32px,calc((100vw-1200px)/2))]"
        aria-label="What FinAI handles"
        role="region"
      >
        {FEATURES.map((f, i) => (
          <article
            key={f.tag}
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${FEATURES.length}`}
            className={cn(
              "flex w-[86vw] max-w-[640px] shrink-0 snap-start flex-col rounded-[28px] border-2 p-6 transition-colors duration-300 sm:w-[560px] sm:p-8",
              i === index ? "border-lime bg-lime-soft" : "border-transparent bg-parchment",
            )}
          >
            <PillTag className="self-start">{f.tag}</PillTag>
            <div className="grid flex-1 grid-cols-1 items-stretch gap-6 pt-6 sm:grid-cols-[1fr_1fr]">
              <div className="flex flex-col">
                <h3 className="text-[28px] leading-[1.14] font-medium tracking-[-0.03em]">{f.title}</h3>
                <p className="mt-3 text-[14px] text-graphite">{f.body}</p>
              </div>
              <div className="flex min-h-[200px] flex-col justify-center rounded-[18px] bg-white p-4">{f.visual}</div>
            </div>
          </article>
        ))}
      </div>
      <div className="shell mt-6 flex items-center justify-between">
        <div className="flex items-center gap-1.5" aria-hidden>
          {FEATURES.map((_, i) => (
            <span key={i} className={cn("h-1.5 rounded-full transition-all duration-300", i === index ? "w-6 bg-ink" : "w-1.5 bg-ash")} />
          ))}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => go(index - 1)}
            disabled={index === 0}
            className="inline-flex size-10 items-center justify-center rounded-full border border-ink disabled:opacity-30"
            aria-label="Previous"
          >
            <ChevronLeft className="size-5" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            disabled={index >= FEATURES.length - 1}
            className="inline-flex size-10 items-center justify-center rounded-full border border-ink disabled:opacity-30"
            aria-label="Next"
          >
            <ChevronRight className="size-5" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </div>
  );
}
