"use client";

import type { UIMessage } from "ai";
import { AudioLines, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ChatThread } from "@/components/chat/chat-thread";
import { cn } from "@/lib/cn";
import { deleteChat } from "@/server/actions";

type Conv = { id: string; title: string; updatedAt: string; voice: boolean };

export function ChatView({ id, initialMessages, conversations }: { id: string; initialMessages: UIMessage[]; conversations: Conv[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [removing, setRemoving] = useState<string | null>(null);

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-3 px-2 pb-2 md:grid-cols-[272px_minmax(0,1fr)] md:px-3 md:pb-3">
      <aside className="hidden min-h-0 flex-col rounded-[28px] bg-parchment p-3 md:flex">
        <Link href="/app/chat" className="flex h-11 items-center justify-center gap-2 rounded-full bg-lime text-[15px] hover:bg-[#b0f23c]">
          <Plus className="size-4" strokeWidth={1.75} aria-hidden />
          New chat
        </Link>
        <p className="eyebrow mt-6 mb-2 px-3 text-graphite">Recent</p>
        <nav aria-label="Chats" className="min-h-0 flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <p className="px-3 py-2 text-[14px] text-graphite">Your chats will show up here.</p>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {conversations.map((c) => (
                <li key={c.id} className="group relative">
                  <Link
                    href={`/app/chat/${c.id}`}
                    aria-current={c.id === id ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2 rounded-full py-2.5 pr-10 pl-4 text-[14px]",
                      c.id === id ? "bg-white font-medium" : "hover:bg-white/70",
                      removing === c.id && "opacity-40",
                    )}
                  >
                    {c.voice && <AudioLines className="size-3.5 shrink-0" strokeWidth={1.75} aria-label="Voice" />}
                    <span className="truncate">{c.title}</span>
                  </Link>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      setRemoving(c.id);
                      start(async () => {
                        await deleteChat(c.id);
                        if (c.id === id) router.push("/app/chat");
                        router.refresh();
                        setRemoving(null);
                      });
                    }}
                    className="absolute top-1/2 right-1.5 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-full opacity-0 group-hover:opacity-100 hover:bg-parchment hover:text-alert focus-visible:opacity-100"
                    aria-label={`Delete ${c.title}`}
                  >
                    <Trash2 className="size-3.5" strokeWidth={1.75} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </nav>
      </aside>
      <div className="min-h-0">
        <ChatThread
          key={id}
          id={id}
          initialMessages={initialMessages}
          onFirstMessage={() => {
            if (!window.location.pathname.endsWith(id)) window.history.replaceState(null, "", `/app/chat/${id}`);
          }}
        />
      </div>
    </div>
  );
}
