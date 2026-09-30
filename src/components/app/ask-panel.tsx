"use client";

import { Maximize2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChatThread } from "@/components/chat/chat-thread";
import { useApp } from "./app-context";

function newChatId() {
  return `chat_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`;
}

/** Slide-over chat on every app page. Keeps one conversation until the user starts a new one. */
export function AskPanel() {
  const { askOpen, setAskOpen } = useApp();
  const [chatId, setChatId] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (askOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lazily create the chat id on first open
      setChatId((id) => id ?? newChatId());
      if (!d.open) d.showModal();
    } else if (d.open) d.close();
  }, [askOpen]);

  return (
    <dialog
      ref={ref}
      aria-label="Ask FinAI"
      onClose={() => setAskOpen(false)}
      onCancel={(e) => {
        e.preventDefault();
        setAskOpen(false);
      }}
      onClick={(e) => {
        if (e.target === ref.current) setAskOpen(false);
      }}
      className="fixed inset-2 m-0 h-[calc(100dvh-16px)] max-h-none w-auto max-w-none flex-col rounded-[28px] border border-ash bg-white p-0 text-ink backdrop:bg-ink/40 open:flex md:inset-y-3 md:right-3 md:left-auto md:h-[calc(100dvh-24px)] md:w-[500px]"
    >
      <div className="flex h-[72px] shrink-0 items-center gap-1 pr-3 pl-6">
        <h2 className="flex-1 text-[22px] font-medium">Ask FinAI</h2>
        {started && (
          <button
            type="button"
            onClick={() => {
              setChatId(newChatId());
              setStarted(false);
            }}
            className="rounded-full px-3 py-1.5 text-[14px] hover:bg-parchment"
          >
            New chat
          </button>
        )}
        {chatId && started && (
          <Link
            href={`/app/chat/${chatId}`}
            onClick={() => setAskOpen(false)}
            className="inline-flex size-10 items-center justify-center rounded-full hover:bg-parchment"
            aria-label="Open full chat"
          >
            <Maximize2 className="size-4" strokeWidth={1.75} />
          </Link>
        )}
        <button type="button" onClick={() => setAskOpen(false)} className="inline-flex size-10 items-center justify-center rounded-full hover:bg-parchment" aria-label="Close">
          <X className="size-5" strokeWidth={1.75} />
        </button>
      </div>
      <div className="min-h-0 flex-1">{chatId && <ChatThread key={chatId} id={chatId} compact onFirstMessage={() => setStarted(true)} />}</div>
    </dialog>
  );
}
