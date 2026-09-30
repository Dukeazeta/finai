"use client";

import { ArrowLeftRight, LayoutGrid, MessageCircle, Mic, Settings, Target, Wallet } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { LogoMark } from "@/components/logo";
import { ReceiptCard } from "@/components/receipt-card";
import { CategoryIcon } from "@/components/ui/category-icon";
import { Money } from "@/components/ui/money";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/money";

/** Product imagery built from FinAI's own components, inside device frames. All figures are examples. */

const BARS = [
  [34, 12], [0, 22], [0, 8], [52, 18], [0, 30], [0, 14], [18, 26], [0, 10], [0, 20], [70, 16], [0, 24], [0, 12], [22, 28], [0, 9],
];

export function MiniCashflow({ tall }: { tall?: boolean }) {
  return (
    <div className="rounded-[18px] bg-charcoal p-4 text-white">
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-ash">Money in and out</span>
        <span className="flex items-center gap-3 text-[11px] text-ash">
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-[2px] bg-lime" />
            In
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-[2px] bg-stone" />
            Out
          </span>
        </span>
      </div>
      <div className={`mt-3 flex items-end gap-[5px] ${tall ? "h-28" : "h-20"}`} aria-hidden>
        {BARS.map(([i, o], k) => (
          <div key={k} className="flex h-full flex-1 items-end gap-[2px]" style={{ ["--b" as string]: k }}>
            <div className="grow-y flex-1 rounded-t-[3px] bg-lime" style={{ height: `${i}%` }} />
            <div className="grow-y flex-1 rounded-t-[3px] bg-stone" style={{ height: `${o}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Hero sequence ---------------- */

type Seq = { step: number; typed: string };

// 0 typing the first sentence, 1 sent, 2 thinking, 3 logged with receipt, 4 dashboard updates,
// 5 typing a question, 6 sent, 7 answered. The server renders the last step so first paint is complete.
const FINAL: Seq = { step: 7, typed: "" };
const FIRST = "Spent 4.5k on suya with my Opay card";
const SECOND = "How much on transport this month?";

function useHeroSequence(root: React.RefObject<HTMLDivElement | null>): Seq {
  const [seq, setSeq] = useState<Seq>(FINAL);

  useEffect(() => {
    const el = root.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let visible = false;
    let cancelled = false;
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
    });
    io.observe(el);

    // Waits that only count down while the hero is on screen and the tab is visible.
    const sleep = async (ms: number) => {
      let left = ms;
      while (left > 0 && !cancelled) {
        await new Promise((r) => setTimeout(r, 50));
        if (visible && !document.hidden) left -= 50;
      }
    };
    const type = async (text: string, step: number) => {
      for (let i = 1; i <= text.length && !cancelled; i++) {
        setSeq({ step, typed: text.slice(0, i) });
        await sleep(50);
      }
    };

    (async () => {
      await sleep(900);
      while (!cancelled) {
        setSeq({ step: 0, typed: "" });
        await sleep(500);
        await type(FIRST, 0);
        await sleep(350);
        setSeq({ step: 1, typed: "" });
        await sleep(450);
        setSeq({ step: 2, typed: "" });
        await sleep(900);
        setSeq({ step: 3, typed: "" });
        await sleep(650);
        setSeq({ step: 4, typed: "" });
        await sleep(1800);
        await type(SECOND, 5);
        await sleep(350);
        setSeq({ step: 6, typed: "" });
        await sleep(1000);
        setSeq({ step: 7, typed: "" });
        await sleep(4200);
      }
    })();

    return () => {
      cancelled = true;
      io.disconnect();
    };
  }, [root]);

  return seq;
}

/** Tweens between money values when the target changes. */
function Ticker({ minor, className }: { minor: number; className?: string }) {
  const [shown, setShown] = useState(minor);
  const from = useRef(minor);
  useEffect(() => {
    const start = from.current;
    if (start === minor) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 700);
      const e = 1 - Math.pow(1 - p, 4);
      setShown(Math.round(start + (minor - start) * e));
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = minor;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [minor]);
  return <span className={className}>{formatMoney(Math.round(shown / 100) * 100, "NGN")}</span>;
}

const ease = "ease-[cubic-bezier(0.16,1,0.3,1)]";

function DashboardScreen({ seq }: { seq: Seq }) {
  const nav = [LayoutGrid, MessageCircle, ArrowLeftRight, Target, Wallet, Settings];
  const logged = seq.step >= 4;
  const fresh = seq.step === 4;
  const stats: [string, number, boolean][] = [
    ["Left over", logged ? 12050000 : 12500000, true],
    ["Money in", 35000000, false],
    ["Money out", logged ? 22950000 : 22500000, true],
  ];
  return (
    <div className="flex h-full bg-white text-ink">
      <div className="flex w-12 flex-col items-center gap-4 border-r border-ash py-4">
        <LogoMark className="size-6" />
        {nav.map((Icon, i) => (
          <span key={i} className={`inline-flex size-7 items-center justify-center rounded-full ${i === 0 ? "bg-lime" : ""}`}>
            <Icon className="size-4" strokeWidth={1.5} />
          </span>
        ))}
      </div>
      <div className="min-w-0 flex-1 p-5">
        <div className="flex items-center justify-between">
          <p className="text-[22px] font-medium tracking-[-0.03em]">Dashboard</p>
          <span className="flex gap-1.5">
            <span className="rounded-full border border-ash px-2.5 py-1 text-[10px]">Ask FinAI</span>
            <span className="rounded-full bg-ink px-2.5 py-1 text-[10px] text-white">+ Add</span>
          </span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {stats.map(([k, v, moves]) => (
            <div key={k} className={cn("rounded-[12px] p-2.5 transition-colors duration-1000", fresh && moves ? "bg-lime-soft" : "bg-parchment")}>
              <div className="text-[10px] text-graphite">{k}</div>
              <Ticker minor={v} className="tabular text-[15px] font-medium" />
            </div>
          ))}
        </div>
        <div className="mt-2.5 grid grid-cols-[1.4fr_1fr] gap-2">
          <MiniCashflow />
          <div className="rounded-[18px] border border-ash p-3">
            <div className="text-[11px] text-graphite">Where it went</div>
            {(
              [
                ["Food and drinks", logged ? 90 : 84],
                ["Transport", 58],
                ["Data and airtime", 34],
                ["Groceries", 26],
              ] as [string, number][]
            ).map(([n, w]) => (
              <div key={n} className="mt-2">
                <div className="text-[10px]">{n}</div>
                <div className="mt-1 h-1.5 rounded-full bg-parchment">
                  <div className={cn("h-full rounded-full bg-ink transition-[width] duration-700", ease)} style={{ width: `${w}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-2.5 grid grid-cols-[1.4fr_1fr] gap-2">
          <div className="rounded-[18px] bg-parchment p-3">
            <div className="text-[11px] text-graphite">Recent entries</div>
            <div className={cn("grid transition-[grid-template-rows,opacity] duration-500", ease, logged ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
              <div className="overflow-hidden">
                <div className={cn("mt-2 flex items-center gap-2 rounded-[8px] transition-colors duration-1000", fresh ? "bg-lime-soft" : "bg-transparent")}>
                  <CategoryIcon name="utensils" size="sm" tone="white" className="size-6" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-medium">Suya spot</div>
                    <div className="text-[9px] text-graphite">Opay · Just now</div>
                  </div>
                  <span className="text-[10px] font-medium">−₦4,500</span>
                </div>
              </div>
            </div>
            {[
              ["briefcase", "Salary", "GTBank · Yesterday", "+₦350,000"],
              ["bus", "Bolt", "Opay · 28 Sep", "−₦3,200"],
              ["smartphone", "MTN data", "GTBank · 27 Sep", "−₦12,000"],
            ].map(([i, n, m, v]) => (
              <div key={n} className="mt-2 flex items-center gap-2 border-t border-ash pt-2">
                <CategoryIcon name={i} size="sm" tone="white" className="size-6" />
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-medium">{n}</div>
                  <div className="text-[9px] text-graphite">{m}</div>
                </div>
                <span className="text-[10px] font-medium">{v}</span>
              </div>
            ))}
          </div>
          <div className="rounded-[18px] border border-ash p-3">
            <div className="text-[11px] text-graphite">Budgets</div>
            {(
              [
                ["Food", logged ? 82 : 76, false],
                ["Transport", 100, true],
                ["Data", 45, false],
              ] as [string, number, boolean][]
            ).map(([n, w, over]) => (
              <div key={n} className="mt-2.5">
                <div className="flex justify-between text-[10px]">
                  <span>
                    {n}
                    {over && <span className="text-alert"> · over budget</span>}
                  </span>
                  <span className="text-graphite">{over ? "" : `${w}%`}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-parchment ring-1 ring-ash ring-inset">
                  <div className={cn("h-full rounded-full transition-[width] duration-700", ease, over ? "bg-alert" : "bg-ink")} style={{ width: `${w}%` }} />
                </div>
              </div>
            ))}
            <div className="mt-3 flex items-center justify-between rounded-[10px] bg-parchment px-2 py-1.5 text-[10px]">
              <span>DSTV due</span>
              <span className="text-graphite">In 5 days</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const pop = "origin-bottom-right animate-[bubble-in_.35s_cubic-bezier(0.16,1,0.3,1)_both]";
const appear = "animate-[fade-up_.4s_cubic-bezier(0.16,1,0.3,1)_both]";

function ChatScreen({ seq }: { seq: Seq }) {
  const { step, typed } = seq;
  const typing = step === 0 || step === 5;
  return (
    <div className="flex h-full flex-col bg-white px-3 pt-8 pb-3 text-ink">
      <div className="flex items-center justify-between">
        <span className="text-[15px] font-medium tracking-[-0.02em]">Ask FinAI</span>
        <span className="inline-flex size-6 items-center justify-center rounded-full bg-lime">
          <Mic className="size-3.5" strokeWidth={1.75} />
        </span>
      </div>
      <div className="mt-3 flex flex-1 flex-col gap-2 overflow-hidden">
        {step >= 1 && (
          <div className={cn("ml-auto max-w-[85%] rounded-[14px] rounded-br-[4px] bg-parchment px-2.5 py-1.5 text-[11px]", step === 1 && pop)}>{FIRST}</div>
        )}
        {step === 2 && (
          <div className="flex gap-1 py-1" aria-hidden>
            {[0, 1, 2].map((i) => (
              <span key={i} className="size-1.5 animate-pulse rounded-full bg-stone" style={{ animationDelay: `${i * 150}ms` }} />
            ))}
          </div>
        )}
        {step >= 3 && (
          <>
            <p className={cn("text-[11px] text-graphite", step === 3 && appear)}>Logged ₦4,500 on Food and drinks.</p>
            <div className={cn("rounded-[12px] border border-ash p-2", step === 3 && "animate-[unclip_.6s_cubic-bezier(0.16,1,0.3,1)_both]")}>
              <div className="flex items-center gap-2">
                <CategoryIcon name="utensils" size="sm" className="size-7" />
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-medium">Food and drinks</div>
                  <div className="text-[9px] text-graphite">Suya · Opay</div>
                </div>
                <span className="tabular text-[11px] font-medium">−₦4,500</span>
              </div>
            </div>
          </>
        )}
        {step >= 6 && (
          <div className={cn("ml-auto max-w-[85%] rounded-[14px] rounded-br-[4px] bg-parchment px-2.5 py-1.5 text-[11px]", step === 6 && pop)}>{SECOND}</div>
        )}
        {step >= 7 && <p className={cn("text-[11px] text-graphite", appear)}>₦18,300 across 9 trips, mostly Bolt.</p>}
      </div>
      <div className={cn("mt-2 flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 transition-colors", typing ? "border-ink" : "border-ash")}>
        <span className={cn("flex-1 truncate text-[10px]", typing && typed ? "text-ink" : "text-graphite")}>
          {typing && typed ? typed : "Spent 2k on…"}
          {typing && <span className="ml-px inline-block h-2.5 w-px translate-y-0.5 animate-pulse bg-ink" />}
        </span>
        <span className={cn("inline-flex size-5 items-center justify-center rounded-full text-[10px] transition-colors", typing && typed ? "bg-lime" : "bg-parchment")}>↑</span>
      </div>
    </div>
  );
}

/** Laptop plus phone plus a lime receipt, staged like perk.com's hero. The sentence in the phone becomes the entry on the laptop. */
export function HeroMockups() {
  const root = useRef<HTMLDivElement>(null);
  const seq = useHeroSequence(root);
  return (
    <div ref={root} className="relative mx-auto w-full max-w-[1200px]" aria-label="Example of FinAI turning a sentence into a dashboard entry" role="img">
      {/* Phones: the chat phone and a receipt, since a laptop at 390px turns to noise. */}
      <div className="relative mx-auto flex w-full max-w-[340px] items-end justify-center pb-0 sm:hidden">
        <div className="aspect-[9/16] w-[72%] overflow-hidden rounded-t-[32px] border-[5px] border-b-0 border-ink bg-white">
          <ChatScreen seq={seq} />
        </div>
        <div className="absolute -right-1 bottom-6 w-[86%] rounded-[18px] bg-lime p-2.5">
          <ReceiptCard status="Logged" type="income" amountMinor={35000000} currency="NGN" category="Salary" icon="briefcase" meta="GTBank" className="border-ink/15" />
        </div>
      </div>
      <div className="relative ml-0 hidden w-[70%] sm:block">
        <div className="rounded-t-[18px] border-[6px] border-b-0 border-ink bg-ink pt-2">
          <div className="mx-auto mb-1.5 h-2.5 w-24 rounded-full bg-charcoal" />
          <div className="aspect-[16/10] overflow-hidden rounded-t-[10px]">
            <DashboardScreen seq={seq} />
          </div>
        </div>
      </div>
      <div className="absolute right-[16%] bottom-0 hidden w-[22%] max-w-[250px] sm:block">
        <div className="aspect-[9/18.5] overflow-hidden rounded-[32px] border-[5px] border-ink bg-white">
          <ChatScreen seq={seq} />
        </div>
      </div>
      <div className="absolute right-0 bottom-[14%] hidden w-[27%] max-w-[320px] min-w-[240px] sm:block">
        <div className="rounded-[18px] bg-lime p-3">
          <ReceiptCard status="Logged" type="income" amountMinor={35000000} currency="NGN" category="Salary" icon="briefcase" meta="GTBank" className="border-ink/15" />
        </div>
      </div>
    </div>
  );
}

export function ChatPanel() {
  return (
    <div className="flex flex-col gap-3 rounded-[18px] bg-white p-5">
      <div className="ml-auto max-w-[85%] rounded-[18px] rounded-br-[6px] bg-parchment px-4 py-2.5 text-[15px]">
        Bought groceries at Shoprite, 23,450, paid with my GTB card
      </div>
      <p className="text-[15px]">Logged ₦23,450 on Groceries.</p>
      <ReceiptCard
        status="Logged"
        type="expense"
        amountMinor={2345000}
        currency="NGN"
        category="Groceries"
        icon="shopping-basket"
        meta="Shoprite · GTBank · Today"
        surface="parchment"
        actions={
          <>
            <span className="text-[14px] font-medium underline underline-offset-4">Edit</span>
            <span className="text-[14px] text-graphite">Undo</span>
          </>
        }
      />
    </div>
  );
}

export function VoicePanel() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-[18px] bg-white p-6 text-center">
      <div className="relative flex size-28 items-center justify-center">
        <span className="absolute inset-0 rounded-full border border-ash" />
        <span className="absolute inset-4 rounded-full bg-lime" />
        <Mic className="relative size-7" strokeWidth={1.5} />
      </div>
      <p className="eyebrow text-graphite">Listening</p>
      <p className="max-w-[30ch] text-[15px] text-graphite">&ldquo;Keke to school, five hundred. And I paid seven thousand for Netflix.&rdquo;</p>
      <div className="grid w-full gap-2 text-left sm:grid-cols-2">
        <ReceiptCard status="Logged" type="expense" amountMinor={50000} currency="NGN" category="Transport" icon="bus" surface="parchment" />
        <ReceiptCard status="Logged" type="expense" amountMinor={700000} currency="NGN" category="Subscriptions" icon="repeat" surface="parchment" />
      </div>
    </div>
  );
}

export function DashboardPanel() {
  return (
    <div className="flex flex-col gap-3 rounded-[18px] bg-white p-5">
      <div className="grid grid-cols-3 gap-2">
        {[
          ["Left over", "₦120,500"],
          ["Money in", "₦350,000"],
          ["Money out", "₦229,500"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-[12px] bg-parchment p-3">
            <div className="text-[11px] text-graphite">{k}</div>
            <div className="tabular text-[16px] font-medium">{v}</div>
          </div>
        ))}
      </div>
      <MiniCashflow tall />
      <div className="flex items-center justify-between rounded-[12px] border border-ash px-3 py-2.5 text-[14px]">
        <span>Salary · GTBank</span>
        <Money minor={35000000} currency="NGN" type="income" className="font-medium" />
      </div>
    </div>
  );
}
