"use client";

import type { LiveServerMessage, Session } from "@google/genai";
import { Keyboard, Mic, MicOff, PhoneOff, SendHorizontal, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "@/components/app/app-context";
import { ToolPart } from "@/components/chat/tool-receipt";
import { cn } from "@/lib/cn";
import { MicCapture, PcmPlayer } from "./live-audio";
import { loadGenAI, takeVoiceToken } from "./voice-prefetch";

type Phase = "connecting" | "listening" | "thinking" | "speaking" | "error" | "ended";
type Turn = { id: string; role: "user" | "assistant"; text: string };
type Action = { id: string; name: string; output: unknown };
type ToolRes = { result?: unknown; writes?: boolean; error?: string };

const PHASE_LABEL: Record<Phase, string> = {
  connecting: "Connecting",
  listening: "Listening",
  thinking: "Working on it",
  speaking: "Speaking",
  error: "Voice stopped",
  ended: "Call ended",
};

function rid(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`;
}

export function VoiceOverlay() {
  const { voiceOpen, setVoiceOpen } = useApp();
  if (!voiceOpen) return null;
  return <VoiceSession onClose={() => setVoiceOpen(false)} />;
}

function VoiceSession({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [live, setLive] = useState({ user: "", assistant: "" });
  const [actions, setActions] = useState<Action[]>([]);
  const [muted, setMuted] = useState(false);
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState("");
  const [connected, setConnected] = useState(false);
  const [micBlocked, setMicBlocked] = useState(false);

  const conversationId = useRef(rid("voice"));
  const session = useRef<Session | null>(null);
  const mic = useRef<MicCapture | null>(null);
  const player = useRef<PcmPlayer | null>(null);
  const orb = useRef<HTMLDivElement>(null);
  const micLevel = useRef(0);
  const pending = useRef({ user: "", assistant: "" });
  const unsaved = useRef<Turn[]>([]);
  const closed = useRef(false);

  const flushTranscript = useCallback(async () => {
    const batch = unsaved.current.splice(0);
    if (!batch.length) return;
    await fetch("/api/voice/transcript", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: conversationId.current, turns: batch }),
      keepalive: true,
    }).catch(() => {});
  }, []);

  const commitTurn = useCallback(() => {
    const { user, assistant } = pending.current;
    const add: Turn[] = [];
    if (user.trim()) add.push({ id: rid("msg"), role: "user", text: user.trim() });
    if (assistant.trim()) add.push({ id: rid("msg"), role: "assistant", text: assistant.trim() });
    pending.current = { user: "", assistant: "" };
    setLive({ user: "", assistant: "" });
    if (add.length) {
      setTurns((t) => [...t, ...add]);
      unsaved.current.push(...add);
      void flushTranscript();
    }
  }, [flushTranscript]);

  const handleToolCalls = useCallback(
    async (calls: NonNullable<LiveServerMessage["toolCall"]>["functionCalls"]) => {
      if (!calls?.length) return;
      setPhase("thinking");
      let wrote = false;
      const responses = await Promise.all(
        calls.map(async (fc) => {
          const res: ToolRes = await fetch("/api/voice/tool", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: fc.name, args: fc.args ?? {}, conversationId: conversationId.current }),
          })
            .then((r) => r.json() as Promise<ToolRes>)
            .catch((): ToolRes => ({ error: "Network error" }));
          const result = res.result ?? { error: res.error ?? "Failed" };
          if (res.writes) {
            wrote = true;
            setActions((a) => [...a, { id: fc.id ?? rid("act"), name: fc.name ?? "", output: result }]);
          }
          return { id: fc.id, name: fc.name, response: { result } };
        }),
      );
      session.current?.sendToolResponse({ functionResponses: responses });
      if (wrote) router.refresh();
    },
    [router],
  );

  const onMessage = useCallback(
    (m: LiveServerMessage) => {
      const sc = m.serverContent;
      if (sc?.interrupted) {
        player.current?.interrupt();
        setPhase("listening");
      }
      if (sc?.inputTranscription?.text) {
        pending.current.user += sc.inputTranscription.text;
        setLive((l) => ({ ...l, user: pending.current.user }));
      }
      if (sc?.outputTranscription?.text) {
        pending.current.assistant += sc.outputTranscription.text;
        setLive((l) => ({ ...l, assistant: pending.current.assistant }));
      }
      for (const part of sc?.modelTurn?.parts ?? []) {
        if (part.inlineData?.data && part.inlineData.mimeType?.startsWith("audio/")) {
          player.current?.play(part.inlineData.data, part.inlineData.mimeType);
          setPhase("speaking");
        }
      }
      if (sc?.turnComplete) {
        commitTurn();
        setPhase("listening");
      }
      if (m.toolCall?.functionCalls) void handleToolCalls(m.toolCall.functionCalls);
    },
    [commitTurn, handleToolCalls],
  );

  useEffect(() => {
    let cancelled = false;
    // Up to ~15 s of speech said before the socket is ready; sent the moment it is.
    const early: string[] = [];

    // Audio out first, while this still counts as part of the user's tap.
    player.current = new PcmPlayer();
    void player.current.resume();

    const micReady = (async () => {
      mic.current = new MicCapture();
      await mic.current.start(
        (b64) => {
          if (session.current) session.current.sendRealtimeInput({ audio: { data: b64, mimeType: "audio/pcm;rate=16000" } });
          else if (early.push(b64) > 150) early.shift();
        },
        (level) => (micLevel.current = level),
      );
      if (!cancelled) setPhase((p) => (p === "connecting" ? "listening" : p));
    })().catch((e: unknown) => {
      if (cancelled) return;
      setMicBlocked(true);
      setTyping(true);
      setError(
        e instanceof DOMException && e.name === "NotAllowedError"
          ? "Microphone access was blocked. Allow it in your browser, or type instead."
          : "Couldn't open the microphone. You can type instead.",
      );
    });

    const open = async ({ promise: tok, warm, claim }: ReturnType<typeof takeVoiceToken>): Promise<void> => {
      const [{ GoogleGenAI }, minted] = await Promise.all([
        loadGenAI(),
        tok.catch((e: unknown) => {
          if (warm) return null;
          throw e;
        }),
      ]);
      if (cancelled) return;
      claim();
      if (!minted) return open({ ...takeVoiceToken(), warm: false });
      const { token, model } = minted;
      let ready = false;
      const ai = new GoogleGenAI({ apiKey: token, httpOptions: { apiVersion: "v1alpha" } });
      const s = await new Promise<Session>((resolve, reject) => {
        ai.live
          .connect({
            model,
            callbacks: {
              onmessage: onMessage,
              onerror: () => {
                if (!ready) return reject(new Error("The voice connection dropped."));
                setError("The voice connection dropped.");
                setPhase("error");
              },
              onclose: () => {
                if (!ready) return reject(new Error("Couldn't start voice."));
                setConnected(false);
                if (!closed.current) setPhase((p) => (p === "error" ? p : "ended"));
              },
            },
          })
          .then(resolve, reject);
      }).catch((e: unknown) => {
        // A warm token can go stale between prefetch and use; try once more with a fresh one.
        if (warm && !cancelled) return null;
        throw e;
      });
      if (!s) return open({ ...takeVoiceToken(), warm: false });
      ready = true;
      if (cancelled) return s.close();
      session.current = s;
      for (const b64 of early.splice(0)) s.sendRealtimeInput({ audio: { data: b64, mimeType: "audio/pcm;rate=16000" } });
      setConnected(true);
      await micReady;
      if (!cancelled) setPhase((p) => (p === "connecting" ? "listening" : p));
    };

    open(takeVoiceToken()).catch((e: unknown) => {
      if (cancelled) return;
      mic.current?.stop();
      setError(e instanceof Error ? e.message : "Couldn't start voice.");
      setPhase("error");
      setTyping(true);
    });

    return () => {
      cancelled = true;
      closed.current = true;
      mic.current?.stop();
      session.current?.close();
      player.current?.close();
      commitTurn();
      void flushTranscript();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The lime disc breathes with whoever is making sound.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const level = Math.max(micLevel.current * 2.2, (player.current?.level() ?? 0) * 3);
      if (orb.current) orb.current.style.transform = `scale(${(1 + Math.min(level, 0.5)).toFixed(3)})`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function sendText() {
    const t = text.trim();
    if (!t || !session.current) return;
    pending.current.user += t;
    setLive((l) => ({ ...l, user: pending.current.user }));
    session.current.sendRealtimeInput({ text: t });
    setText("");
    setPhase("thinking");
  }

  const recent = turns.slice(-4);
  const idle = phase === "error" || phase === "ended";

  return (
    <div role="dialog" aria-modal="true" aria-label="Voice mode" className="fixed inset-0 z-50 flex flex-col bg-parchment p-3 text-ink">
      <div className="flex h-16 shrink-0 items-center justify-between rounded-[28px] bg-white px-5">
        <span className="eyebrow">Voice · Gemini Live</span>
        <button type="button" onClick={onClose} className="inline-flex size-10 items-center justify-center rounded-full hover:bg-parchment" aria-label="Close voice mode">
          <X className="size-5" strokeWidth={1.75} />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto">
        <div className="flex w-full max-w-[600px] flex-1 flex-col items-center px-4 pt-[6vh]">
          <div className="relative flex size-48 items-center justify-center sm:size-56">
            <div aria-hidden className="absolute inset-0 rounded-full border border-ash" />
            <div
              ref={orb}
              aria-hidden
              className={cn("absolute inset-8 rounded-full", idle ? "bg-ash" : phase === "speaking" ? "bg-ink" : "bg-lime")}
              style={{ transition: "transform 90ms linear, background-color 400ms" }}
            />
            {!idle && <Mic className={cn("relative size-8", phase === "speaking" ? "text-lime" : "text-ink")} strokeWidth={1.5} aria-hidden />}
          </div>
          <p className="mt-8 text-[clamp(2.25rem,5vw,3.75rem)] leading-[1] font-medium tracking-[-0.03em]" aria-live="polite">
            {phase === "listening" && (muted || micBlocked) ? (micBlocked ? "Ready" : "Muted") : PHASE_LABEL[phase]}
          </p>
          {phase === "listening" && turns.length === 0 && !live.user && (
            <p className="mt-3 text-center text-graphite">Try &ldquo;I spent two thousand on transport this morning.&rdquo;</p>
          )}
          {error && (
            <p role="alert" className="mt-4 max-w-[40ch] text-center text-[15px] text-alert">
              {error}
            </p>
          )}

          <div className="mt-8 flex w-full flex-col gap-3">
            {recent.map((t) => (
              <p key={t.id} className={cn("text-[16px]", t.role === "user" ? "text-graphite" : "text-ink")}>
                <span className="sr-only">{t.role === "user" ? "You said: " : "FinAI said: "}</span>
                {t.text}
              </p>
            ))}
            {live.user && <p className="text-[16px] text-graphite">{live.user}</p>}
            {live.assistant && <p className="text-[16px]">{live.assistant}</p>}
          </div>

          {actions.length > 0 && (
            <div className="mt-6 flex w-full flex-col gap-3 pb-6">
              {actions.map((a) => (
                <ToolPart key={a.id} name={a.name} state="output-available" output={a.output} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 rounded-[28px] bg-white p-4 pb-[max(16px,env(safe-area-inset-bottom))]">
        {typing && (
          <form
            className="mx-auto mb-3 flex max-w-[600px] gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              sendText();
            }}
          >
            <label htmlFor="voice-text" className="sr-only">
              Type instead
            </label>
            <input
              id="voice-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type instead of speaking"
              className="h-12 flex-1 rounded-[8px] border border-ash px-4 text-[16px] outline-none focus:border-ink"
              autoFocus
            />
            <button
              type="submit"
              disabled={!text.trim() || !connected}
              className="inline-flex size-12 items-center justify-center rounded-full bg-lime disabled:bg-parchment disabled:text-stone"
              aria-label="Send"
            >
              <SendHorizontal className="size-5" strokeWidth={1.75} />
            </button>
          </form>
        )}
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setTyping((t) => !t)}
            aria-pressed={typing}
            aria-label="Type instead"
            className={cn("inline-flex size-14 items-center justify-center rounded-full border", typing ? "border-ink bg-ink text-white" : "border-ash hover:border-ink")}
          >
            <Keyboard className="size-5" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={() => {
              const next = !muted;
              setMuted(next);
              if (mic.current) mic.current.muted = next;
            }}
            aria-pressed={muted}
            disabled={!connected}
            aria-label={muted ? "Unmute" : "Mute"}
            className={cn("inline-flex size-14 items-center justify-center rounded-full border disabled:opacity-40", muted ? "border-ink bg-ink text-white" : "border-ash hover:border-ink")}
          >
            {muted ? <MicOff className="size-5" strokeWidth={1.75} /> : <Mic className="size-5" strokeWidth={1.75} />}
          </button>
          <button type="button" onClick={onClose} className="inline-flex h-14 items-center gap-2 rounded-full bg-ink px-7 text-white hover:bg-charcoal">
            <PhoneOff className="size-5" strokeWidth={1.75} />
            End
          </button>
        </div>
      </div>
    </div>
  );
}
