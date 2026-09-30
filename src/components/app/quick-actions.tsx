"use client";

import { MessageCircle, Mic, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { prefetchVoice } from "@/components/voice/voice-prefetch";
import { useApp } from "./app-context";

/** The three ways to log. On a lime surface the filled button turns ink, since lime is already the ground. */
export function QuickActions({ onLime }: { onLime?: boolean }) {
  const { openTxForm, setAskOpen, setVoiceOpen } = useApp();
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant={onLime ? "dark" : "primary"} onClick={() => setAskOpen(true)}>
        <MessageCircle className="size-[18px]" strokeWidth={1.75} aria-hidden />
        Tell FinAI
      </Button>
      <Button variant="outline" onClick={() => setVoiceOpen(true)} onPointerEnter={prefetchVoice} onFocus={prefetchVoice}>
        <Mic className="size-[18px]" strokeWidth={1.75} aria-hidden />
        Say it
      </Button>
      <Button variant="ghost" onClick={() => openTxForm()} className={onLime ? "hover:bg-white/40" : ""}>
        <Plus className="size-4" strokeWidth={1.75} aria-hidden />
        Add by hand
      </Button>
    </div>
  );
}

export function AddButton({ label = "Add an entry", defaults }: { label?: string; defaults?: { type?: "income" | "expense" | "transfer" } }) {
  const { openTxForm } = useApp();
  return (
    <Button variant="outline" chevron onClick={() => openTxForm(null, defaults)}>
      {label}
    </Button>
  );
}
