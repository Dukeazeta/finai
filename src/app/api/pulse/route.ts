import { z } from "zod";
import { insertError, insertEvents, requestMeta, type EventInput } from "@/server/pulse/record";
import { getSession } from "@/server/session";

const id = z.string().regex(/^[A-Za-z0-9_-]{8,64}$/);

const body = z.object({
  v: id,
  s: id,
  e: z
    .array(
      z.object({
        k: z.enum(["pageview", "click", "vital", "event", "error"]),
        n: z.string().min(1).max(200),
        p: z.string().max(300).optional(),
        t: z.number().optional(),
        val: z.number().finite().optional(),
        r: z.string().max(300).optional(),
        d: z.record(z.string(), z.union([z.string().max(300), z.number(), z.boolean(), z.null()])).optional(),
        st: z.string().max(8000).optional(),
        en: z.string().max(120).optional(),
      }),
    )
    .min(1)
    .max(50),
});

/** Receives batches from the Pulse browser script. Always answers 204 so it never shows up as an error for users. */
export async function POST(req: Request) {
  if (Number(req.headers.get("content-length") ?? 0) > 96_000) return new Response(null, { status: 204 });
  const meta = requestMeta(req.headers);
  if (meta.bot) return new Response(null, { status: 204 });

  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response(null, { status: 204 });
  const { v, s, e } = parsed.data;

  const session = await getSession().catch(() => null);
  const userId = session?.user.id ?? null;
  const now = Date.now();
  // Client clocks drift; keep their order but never trust them by more than an hour.
  const when = (t?: number) => new Date(t && t > now - 3_600_000 && t <= now + 60_000 ? t : now);

  const events: EventInput[] = [];
  const errors = [];
  for (const ev of e) {
    if (ev.k === "error") {
      errors.push(
        insertError({
          source: "client",
          name: ev.en || "Error",
          message: ev.n,
          stack: ev.st,
          path: ev.p,
          userId,
          visitorId: v,
          sessionId: s,
          props: ev.d ?? null,
          browser: meta.browser,
          os: meta.os,
        }),
      );
      continue;
    }
    events.push({
      kind: ev.k,
      name: ev.n,
      path: ev.p,
      value: ev.val,
      referrer: ev.r,
      props: ev.d ?? null,
      userId,
      visitorId: v,
      sessionId: s,
      ts: when(ev.t),
    });
  }

  try {
    await Promise.all([insertEvents(events, meta), ...errors]);
  } catch (err) {
    console.error("pulse ingest", err);
  }
  return new Response(null, { status: 204 });
}
