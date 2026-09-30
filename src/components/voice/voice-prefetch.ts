/**
 * Warms everything voice mode needs before the user taps the mic: a Live API token,
 * the Gemini SDK chunk and the capture worklet. Opening voice then only has to
 * open the socket and the microphone, in parallel.
 */

export type VoiceToken = { token: string; model: string };

// The server lets a token start a session for 10 minutes; stay well inside that.
const FRESH_MS = 8 * 60 * 1000;

let pending: { promise: Promise<VoiceToken>; at: number } | null = null;

async function mintToken(): Promise<VoiceToken> {
  const res = await fetch("/api/voice/token", { method: "POST" });
  const data = (await res.json().catch(() => ({}))) as Partial<VoiceToken> & { error?: string };
  if (!res.ok || !data.token || !data.model) throw new Error(data.error ?? "Couldn't start voice.");
  return { token: data.token, model: data.model };
}

export function loadGenAI() {
  return import("@google/genai");
}

/** Safe to call often: it only mints a new token when the cached one is missing or stale. */
export function prefetchVoice() {
  if (!pending || Date.now() - pending.at > FRESH_MS) {
    const promise = mintToken();
    const entry = { promise, at: Date.now() };
    pending = entry;
    promise.catch(() => {
      if (pending === entry) pending = null;
    });
  }
  void loadGenAI().catch(() => {});
  void fetch("/worklets/pcm-capture.js", { priority: "low" } as RequestInit).catch(() => {});
}

type Claim = { promise: Promise<VoiceToken>; warm: boolean; claim: () => void };

/**
 * Offers the warm token, or mints one now. Tokens are single use, so the caller calls
 * claim() only when it actually opens a session; a voice screen that closes before
 * that leaves the token for the next one.
 */
export function takeVoiceToken(): Claim {
  const entry = pending;
  if (entry && Date.now() - entry.at <= FRESH_MS) {
    return { promise: entry.promise, warm: true, claim: () => pending === entry && (pending = null) };
  }
  pending = null;
  return { promise: mintToken(), warm: false, claim: () => {} };
}

/** Call after the user's accounts or categories change, since the token carries them in its instructions. */
export function dropVoiceToken() {
  pending = null;
}
