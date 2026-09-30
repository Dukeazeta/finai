"use client";

import { useState } from "react";
import { ArrowLink } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { ChatPanel, DashboardPanel, VoicePanel } from "./mockups";

const TABS = [
  {
    id: "chat",
    label: "Chat",
    title: "Type it like a text",
    body: "Type it the way you'd text a friend. FinAI picks the category, the account and the date, writes the entry, and shows you a receipt you can edit or undo.",
    link: "Try the chat",
    panel: <ChatPanel />,
  },
  {
    id: "voice",
    label: "Voice",
    title: "Say it out loud",
    body: "Hands full at the market? Tap the mic and say it. Gemini Live listens, answers out loud, and logs each thing you mention as you talk.",
    link: "Try voice mode",
    panel: <VoicePanel />,
  },
  {
    id: "dashboard",
    label: "Dashboard",
    title: "Watch it add up",
    body: "Money in, money out, where it went, what's left in each budget and which bills are due. All of it is built from what you logged, updated the moment you log it.",
    link: "See the dashboard",
    panel: <DashboardPanel />,
  },
];

/** perk.com's Travel / Spend / Events card, carrying FinAI's three ways in. */
export function ProductTabs() {
  const [active, setActive] = useState(TABS[0].id);
  const tab = TABS.find((t) => t.id === active)!;

  return (
    <div className="grid grid-cols-1 gap-8 rounded-[28px] bg-parchment p-6 sm:p-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12 lg:p-10">
      <div className="flex flex-col">
        <div role="tablist" aria-label="Ways to log" className="inline-flex w-max gap-1 rounded-full bg-white p-1.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={active === t.id}
              aria-controls={`panel-${t.id}`}
              onClick={() => setActive(t.id)}
              className={cn(
                "h-9 rounded-full px-4 text-[14px] transition-colors duration-200",
                active === t.id ? "bg-lime font-medium" : "text-ink hover:bg-parchment",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="mt-8 flex flex-1 flex-col justify-end gap-5 lg:mt-0">
          <div key={tab.id} className="animate-[fade-up_.35s_var(--ease-out-soft)]">
            <h3 className="text-[28px] leading-[1.14] font-medium tracking-[-0.03em]">{tab.title}</h3>
            <p className="mt-3 max-w-[40ch] text-[16px] text-graphite">{tab.body}</p>
          </div>
          <ArrowLink href="/sign-up">{tab.link}</ArrowLink>
        </div>
      </div>
      <div id={`panel-${tab.id}`} role="tabpanel" aria-labelledby={`tab-${tab.id}`} key={tab.id} className="animate-[fade-up_.35s_var(--ease-out-soft)]">
        {tab.panel}
      </div>
    </div>
  );
}
