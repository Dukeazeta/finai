import { lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { pulseErrors, pulseEvents, pulseIssues } from "@/db/schema";

const KEEP_DAYS = 90;

/** Daily Vercel Cron job: drops Pulse data older than 90 days so the free database stays small. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });

  const cutoff = sql`now() - make_interval(days => ${KEEP_DAYS})`;
  const events = await db.delete(pulseEvents).where(lt(pulseEvents.ts, cutoff)).returning({ id: pulseEvents.id });
  const errors = await db.delete(pulseErrors).where(lt(pulseErrors.ts, cutoff)).returning({ id: pulseErrors.id });
  const issues = await db.delete(pulseIssues).where(lt(pulseIssues.lastSeen, cutoff)).returning({ id: pulseIssues.id });
  return Response.json({ events: events.length, errors: errors.length, issues: issues.length });
}
