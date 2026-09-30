import "server-only";
import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { after } from "next/server";
import { db } from "@/db";
import { pulseErrors, pulseEvents, pulseIssues } from "@/db/schema";
import { sendEmail } from "@/server/email";
import { pulseAdmins } from "./admin";
import { readAgent } from "./ua";

export type EventKind = "pageview" | "click" | "vital" | "event" | "auth";

export type EventInput = {
  kind: EventKind;
  name: string;
  userId?: string | null;
  visitorId?: string | null;
  sessionId?: string | null;
  path?: string | null;
  value?: number | null;
  props?: Record<string, unknown> | null;
  referrer?: string | null;
  ts?: Date;
};

export type RequestMeta = { country: string | null; device: string; browser: string; os: string; bot: boolean };

/** Where a request came from, using Vercel's geo header and the user agent. */
export function requestMeta(headers: Headers): RequestMeta {
  const agent = readAgent(headers.get("user-agent"));
  const country = headers.get("x-vercel-ip-country");
  return { country: country && country !== "XX" ? country : null, device: agent.device, browser: agent.browser, os: agent.os, bot: agent.bot };
}

const clip = (s: string | null | undefined, n: number) => (s == null ? null : s.length > n ? s.slice(0, n) : s);

export async function insertEvents(events: EventInput[], meta?: Partial<RequestMeta>) {
  if (!events.length) return;
  await db.insert(pulseEvents).values(
    events.map((e) => ({
      ts: e.ts,
      kind: e.kind,
      name: clip(e.name, 200)!,
      userId: e.userId ?? null,
      visitorId: clip(e.visitorId, 64),
      sessionId: clip(e.sessionId, 64),
      path: clip(e.path, 300),
      value: e.value ?? null,
      props: e.props ?? null,
      referrer: clip(e.referrer, 300),
      country: meta?.country ?? null,
      device: meta?.device ?? null,
      browser: meta?.browser ?? null,
      os: meta?.os ?? null,
    })),
  );
}

/**
 * Runs monitoring work after the response is sent, so it never slows a user down.
 * Outside a request (scripts, instrumentation) it just runs.
 */
export function defer(work: () => Promise<unknown>) {
  const safe = () => work().catch((e) => console.error("pulse:", e));
  try {
    after(safe);
  } catch {
    void safe();
  }
}

/** Server side product event, such as a sign in or an AI reply. */
export function recordEvent(event: EventInput, headers?: Headers) {
  const meta = headers ? requestMeta(headers) : undefined;
  defer(() => insertEvents([event], meta));
}

/* ------------------------------ errors ------------------------------ */

export type ErrorInput = {
  source: "client" | "server";
  name: string;
  message: string;
  stack?: string | null;
  path?: string | null;
  userId?: string | null;
  visitorId?: string | null;
  sessionId?: string | null;
  props?: Record<string, unknown> | null;
  browser?: string | null;
  os?: string | null;
};

/** Strips the parts of a message that change between occurrences (ids, numbers, urls) so they group. */
export function normalizeMessage(message: string) {
  return message
    .replace(/https?:\/\/\S+/g, "<url>")
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "<uuid>")
    .replace(/\b[a-z]+_[A-Za-z0-9]{8,}\b/g, "<id>")
    .replace(/\b[0-9a-f]{16,}\b/gi, "<hex>")
    .replace(/\d+(\.\d+)?/g, "<n>")
    .replace(/(["'`]).{1,80}?\1/g, "<str>")
    .slice(0, 300);
}

/** First stack frame's function name, which survives new deploys better than file names and line numbers. */
export function culpritOf(stack: string | null | undefined) {
  const frame = stack?.split("\n").find((l) => /^\s*at\s|@/.test(l) && !/node_modules|node:internal|<anonymous>/.test(l));
  if (!frame) return null;
  const fn = frame.match(/at\s+(?:async\s+)?([^\s(]+)\s*\(/)?.[1] ?? frame.match(/^\s*([^@\s]+)@/)?.[1];
  return fn && fn !== "Object.<anonymous>" ? fn.slice(0, 120) : null;
}

export function fingerprint(e: Pick<ErrorInput, "source" | "name" | "message" | "stack">) {
  const culprit = culpritOf(e.stack);
  const key = [e.source, e.name, normalizeMessage(e.message), culprit ?? ""].join("|");
  return { id: createHash("sha1").update(key).digest("hex").slice(0, 20), culprit };
}

export async function insertError(e: ErrorInput) {
  const { id, culprit } = fingerprint(e);
  const [issue] = await db
    .insert(pulseIssues)
    .values({ id, source: e.source, name: clip(e.name, 120)!, message: clip(e.message, 1000)!, culprit, count: 1 })
    .onConflictDoUpdate({
      target: pulseIssues.id,
      set: {
        count: sql`${pulseIssues.count} + 1`,
        lastSeen: sql`now()`,
        message: clip(e.message, 1000)!,
        // A resolved issue that happens again is a regression, so it reopens.
        status: sql`case when ${pulseIssues.status} = 'resolved' then 'open' else ${pulseIssues.status} end`,
      },
    })
    .returning({ count: pulseIssues.count, status: pulseIssues.status });

  await db.insert(pulseErrors).values({
    issueId: id,
    userId: e.userId ?? null,
    visitorId: clip(e.visitorId, 64),
    sessionId: clip(e.sessionId, 64),
    path: clip(e.path, 300),
    stack: clip(e.stack, 8000),
    props: e.props ?? null,
    browser: e.browser ?? null,
    os: e.os ?? null,
  });

  if (issue?.count === 1) await alertNewIssue(id, e);
}

/** Stack plus the chain of causes, which is where fetch and database errors keep the real reason. */
export function stackWithCauses(err: Error) {
  let out = err.stack ?? `${err.name}: ${err.message}`;
  let cause = err.cause;
  for (let depth = 0; cause && depth < 3; depth++) {
    const c = cause instanceof Error ? cause : new Error(String(cause));
    out += `
Caused by: ${c.stack ?? `${c.name}: ${c.message}`}`;
    cause = c.cause;
  }
  return out;
}

/** Server error from anywhere on the server. Never throws. */
export function recordError(error: unknown, ctx: Omit<ErrorInput, "name" | "message" | "stack" | "source"> = {}) {
  const err = error instanceof Error ? error : new Error(String(error));
  defer(() => insertError({ source: "server", name: err.name, message: err.message, stack: stackWithCauses(err), ...ctx }));
}

async function alertNewIssue(id: string, e: ErrorInput) {
  const to = pulseAdmins();
  if (!to.length) return;
  const base = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  const body = `A new ${e.source} error showed up in FinAI.\n\n${e.name}: ${e.message}\n${e.path ? `Page: ${e.path}\n` : ""}\nSee it in Pulse: ${base}/app/pulse/errors/${id}`;
  await Promise.all(to.map((addr) => sendEmail(addr, `New error: ${e.message.slice(0, 80)}`, body).catch(() => {})));
}
