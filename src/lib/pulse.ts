/**
 * Pulse browser client. Queues events and sends them in small batches to /api/pulse.
 * No cookies: a random visitor id lives in localStorage, and a visit ends after 30 idle minutes.
 * Anyone can opt out with localStorage.pulse_off = "1". Pulse's own pages don't count as traffic.
 */

type Kind = "pageview" | "click" | "vital" | "event" | "error";
type Data = Record<string, string | number | boolean | null>;
type Ev = { k: Kind; n: string; p?: string; t?: number; val?: number; r?: string; d?: Data; st?: string; en?: string };

const ENDPOINT = "/api/pulse";
const IDLE_MS = 30 * 60 * 1000;
const queue: Ev[] = [];
let timer: ReturnType<typeof setTimeout> | undefined;
const errorCounts = new Map<string, number>();

function rid() {
  return crypto.randomUUID().replaceAll("-", "").slice(0, 20);
}

function store(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function pulseDisabled() {
  if (typeof window === "undefined") return true;
  return store()?.getItem("pulse_off") === "1";
}

// Your own time in the dashboard shouldn't count as traffic, but errors there still should.
const onDashboard = () => location.pathname.startsWith("/app/pulse");

function ids() {
  const ls = store();
  let v = ls?.getItem("pulse_vid");
  if (!v) {
    v = rid();
    ls?.setItem("pulse_vid", v);
  }
  const now = Date.now();
  const [sid, last] = (ls?.getItem("pulse_sid") ?? "").split(".");
  const s = sid && now - Number(last) < IDLE_MS ? sid : rid();
  ls?.setItem("pulse_sid", `${s}.${now}`);
  return { v, s, fresh: s !== sid };
}

export function flush(useBeacon = false) {
  if (!queue.length || pulseDisabled()) return;
  clearTimeout(timer);
  timer = undefined;
  const { v, s } = ids();
  while (queue.length) {
    const payload = JSON.stringify({ v, s, e: queue.splice(0, 50) });
    if (useBeacon && navigator.sendBeacon?.(ENDPOINT, new Blob([payload], { type: "application/json" }))) continue;
    void fetch(ENDPOINT, { method: "POST", body: payload, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
  }
}

export function send(ev: Ev) {
  if (pulseDisabled() || (onDashboard() && (ev.k === "pageview" || ev.k === "click" || ev.k === "vital"))) return;
  queue.push({ p: location.pathname, ...ev, t: Date.now() });
  if (queue.length >= 20) flush();
  else if (!timer) timer = setTimeout(() => flush(), 4000);
}

/** True when this page view starts a new visit (used to attach the referrer once). */
export function isNewVisit() {
  return ids().fresh;
}

export const pulse = {
  /** Custom product event, e.g. pulse.track("voice_ready", { warm: true }, 820). */
  track(name: string, data?: Data, value?: number) {
    send({ k: "event", n: name, d: data, val: value });
  },
  /** Report a caught error; error boundaries and the global listeners use this. */
  error(error: unknown, data?: Data) {
    const err = error instanceof Error ? error : new Error(typeof error === "string" ? error : JSON.stringify(error)?.slice(0, 300) ?? "Unknown error");
    const key = `${err.name}:${err.message}`;
    const seen = errorCounts.get(key) ?? 0;
    if (seen >= 3) return; // one broken loop shouldn't flood the table
    errorCounts.set(key, seen + 1);
    send({ k: "error", n: err.message.slice(0, 200) || err.name, en: err.name.slice(0, 120), st: err.stack?.slice(0, 8000), d: data });
    flush();
  },
};
