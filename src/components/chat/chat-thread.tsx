"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, getToolName, isToolUIPart, type UIMessage } from "ai";
import { ArrowUp, Mic, Square } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/components/app/app-context";
import { cn } from "@/lib/cn";
import { RichText } from "./rich-text";
import { ToolPart } from "./tool-receipt";

const WRITE_TOOLS = new Set([
  "add_transaction",
  "update_transaction",
  "delete_transaction",
  "undo_last_action",
  "restore_transaction",
  "create_account",
  "create_category",
  "set_budget",
  "add_recurring",
]);

const SUGGESTIONS = ["I spent 4.5k on lunch", "Got paid 350k salary today", "How much did I spend this month?", "Set a 60k budget for food"];

export function ChatThread({
  id,
  initialMessages = [],
  compact,
  onFirstMessage,
}: {
  id: string;
  initialMessages?: UIMessage[];
  compact?: boolean;
  onFirstMessage?: () => void;
}) {
  const router = useRouter();
  const { setVoiceOpen } = useApp();
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const { messages, sendMessage, status, stop, error, clearError } = useChat({
    id,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: ({ messages, id }) => ({ body: { id, message: messages[messages.length - 1] } }),
    }),
    onFinish: ({ message }) => {
      if (message.parts.some((p) => isToolUIPart(p) && WRITE_TOOLS.has(getToolName(p)))) router.refresh();
    },
  });

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  function send(text: string) {
    const t = text.trim();
    if (!t || busy) return;
    if (messages.length === 0) onFirstMessage?.();
    clearError();
    sendMessage({ text: t });
    setInput("");
    requestAnimationFrame(() => {
      if (textRef.current) textRef.current.style.height = "";
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto" aria-live="polite">
        <div className={cn("mx-auto flex w-full max-w-[760px] flex-col gap-6 px-5 py-6", !compact && "sm:px-8")}>
          {messages.length === 0 && (
            <div className={cn("flex flex-col gap-6", compact ? "pt-2" : "pt-[8vh]")}>
              <div>
                <h2 className={cn("font-medium tracking-[-0.03em]", compact ? "text-[28px] leading-[1.14]" : "text-[clamp(2.5rem,5vw,3.75rem)] leading-[1]")}>
                  What moved today?
                </h2>
                <p className="mt-3 max-w-[46ch] text-graphite">
                  Tell me what you spent, earned or moved, the way you&apos;d text a friend. Ask me anything about your money too.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="rounded-full border border-ash bg-white px-4 py-2 text-[14px] transition-colors hover:border-lime hover:bg-lime"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) =>
            m.role === "user" ? (
              <div key={m.id} className="flex justify-end">
                <div className="max-w-[85%] rounded-[18px] rounded-br-[6px] bg-parchment px-4 py-2.5 whitespace-pre-wrap">
                  {m.parts.map((p, i) => (p.type === "text" ? <span key={i}>{p.text}</span> : null))}
                </div>
              </div>
            ) : (
              <div key={m.id} className="flex flex-col gap-3 leading-[1.55]">
                {m.parts.map((p, i) => {
                  if (p.type === "text") return p.text.trim() ? <RichText key={i} text={p.text} /> : null;
                  if (isToolUIPart(p))
                    return <ToolPart key={p.toolCallId} name={getToolName(p)} state={p.state} output={"output" in p ? p.output : undefined} />;
                  return null;
                })}
              </div>
            ),
          )}

          {status === "submitted" && (
            <div className="flex items-center gap-1.5" aria-label="FinAI is thinking">
              {[0, 1, 2].map((i) => (
                <span key={i} className="size-2 animate-pulse rounded-full bg-stone" style={{ animationDelay: `${i * 160}ms` }} />
              ))}
            </div>
          )}

          {error && (
            <div role="alert" className="rounded-[18px] border border-alert/30 bg-[#fdf1ee] px-4 py-3 text-[14px] text-alert">
              {readableError(error)}
            </div>
          )}
        </div>
      </div>

      <div className="px-4 pt-2 pb-[max(12px,env(safe-area-inset-bottom))]">
        <form
          className="mx-auto flex w-full max-w-[760px] items-end gap-1.5 rounded-[28px] border border-ash bg-white p-1.5 pl-5 transition-colors focus-within:border-ink"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <label htmlFor={`chat-${id}`} className="sr-only">
            Message FinAI
          </label>
          <textarea
            id={`chat-${id}`}
            ref={textRef}
            rows={1}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Spent 2k on transport…"
            className="max-h-40 min-h-10 flex-1 resize-none bg-transparent py-2 text-[16px] outline-none placeholder:text-graphite"
          />
          <button
            type="button"
            onClick={() => setVoiceOpen(true)}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-ink transition-colors hover:bg-parchment"
            aria-label="Talk to FinAI"
          >
            <Mic className="size-5" strokeWidth={1.75} />
          </button>
          {busy ? (
            <button type="button" onClick={() => stop()} className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-ink text-white" aria-label="Stop">
              <Square className="size-3.5 fill-current" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-lime text-ink transition-colors hover:bg-[#b0f23c] disabled:bg-parchment disabled:text-stone"
              aria-label="Send"
            >
              <ArrowUp className="size-5" strokeWidth={1.75} />
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

function readableError(e: Error) {
  try {
    const j = JSON.parse(e.message) as { error?: string };
    if (j.error) return j.error;
  } catch {}
  return e.message && e.message.length < 160 ? e.message : "Something went wrong. Try sending that again.";
}
