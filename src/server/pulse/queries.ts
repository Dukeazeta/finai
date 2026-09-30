import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";

export type PulseRange = "24h" | "7d" | "30d" | "90d";
export const RANGES: PulseRange[] = ["24h", "7d", "30d", "90d"];
export const RANGE_LABELS: Record<PulseRange, string> = { "24h": "24 hours", "7d": "7 days", "30d": "30 days", "90d": "90 days" };
const RANGE_MS: Record<PulseRange, number> = { "24h": 864e5, "7d": 7 * 864e5, "30d": 30 * 864e5, "90d": 90 * 864e5 };

export function parseRange(v: string | string[] | undefined): PulseRange {
  const s = Array.isArray(v) ? v[0] : v;
  return RANGES.includes(s as PulseRange) ? (s as PulseRange) : "7d";
}

/** ISO strings rather than Dates: the postgres driver only accepts Date params for typed columns, not raw SQL. */
export function bounds(range: PulseRange) {
  const end = Date.now();
  const start = new Date(end - RANGE_MS[range]).toISOString();
  const prevStart = new Date(end - 2 * RANGE_MS[range]).toISOString();
  return { start, prevStart, unit: range === "24h" ? "hour" : "day" } as const;
}

async function rows<T>(query: ReturnType<typeof sql>) {
  return (await db.execute(query)) as unknown as T[];
}

async function one<T>(query: ReturnType<typeof sql>) {
  return (await rows<T>(query))[0];
}

/* ------------------------------ overview ------------------------------ */

export type Kpi = { now: number; before: number };

export async function getOverview(range: PulseRange, tz: string) {
  const { start, prevStart, unit } = bounds(range);

  const [traffic, people, errors, live] = await Promise.all([
    one<{ v: number; pv: number; s: number; pv_prev: number; v_prev: number; s_prev: number }>(sql`
      select
        count(distinct visitor_id) filter (where ts >= ${start}::timestamptz)::int as v,
        count(*) filter (where ts >= ${start}::timestamptz)::int as pv,
        count(distinct session_id) filter (where ts >= ${start}::timestamptz)::int as s,
        count(distinct visitor_id) filter (where ts < ${start}::timestamptz)::int as v_prev,
        count(*) filter (where ts < ${start}::timestamptz)::int as pv_prev,
        count(distinct session_id) filter (where ts < ${start}::timestamptz)::int as s_prev
      from pulse_events where kind = 'pageview' and ts >= ${prevStart}::timestamptz`),
    one<{ signups: number; signups_prev: number; active: number; active_prev: number; total: number }>(sql`
      select
        (select count(*)::int from "user" where created_at >= ${start}::timestamptz) as signups,
        (select count(*)::int from "user" where created_at >= ${prevStart}::timestamptz and created_at < ${start}::timestamptz) as signups_prev,
        (select count(distinct user_id)::int from pulse_events where user_id is not null and ts >= ${start}::timestamptz) as active,
        (select count(distinct user_id)::int from pulse_events where user_id is not null and ts >= ${prevStart}::timestamptz and ts < ${start}::timestamptz) as active_prev,
        (select count(*)::int from "user") as total`),
    one<{ n: number; n_prev: number; open: number }>(sql`
      select
        count(*) filter (where ts >= ${start}::timestamptz)::int as n,
        count(*) filter (where ts < ${start}::timestamptz)::int as n_prev,
        (select count(*)::int from pulse_issues where status = 'open') as open
      from pulse_errors where ts >= ${prevStart}::timestamptz`),
    one<{ n: number }>(sql`select count(distinct visitor_id)::int as n from pulse_events where ts > now() - interval '5 minutes'`),
  ]);

  const [series, pages, referrers, countries, devices, browsers, clicks, funnel, entries, auth] = await Promise.all([
    rows<{ bucket: string; visitors: number; views: number }>(sql`
      with b as (
        select generate_series(
          date_trunc(${unit}, ${start}::timestamptz at time zone ${tz}),
          date_trunc(${unit}, now() at time zone ${tz}),
          (${"1 " + unit})::interval) as bucket
      ), e as (
        select date_trunc(${unit}, ts at time zone ${tz}) as bucket, count(*)::int as views, count(distinct visitor_id)::int as visitors
        from pulse_events where kind = 'pageview' and ts >= ${start}::timestamptz group by 1
      )
      select to_char(b.bucket, ${unit === "hour" ? "YYYY-MM-DD HH24:00" : "YYYY-MM-DD"}) as bucket,
        coalesce(e.visitors, 0) as visitors, coalesce(e.views, 0) as views
      from b left join e using (bucket) order by b.bucket`),
    rows<{ name: string; views: number; visitors: number }>(sql`
      select name, count(*)::int as views, count(distinct visitor_id)::int as visitors
      from pulse_events where kind = 'pageview' and ts >= ${start}::timestamptz group by name order by views desc limit 8`),
    rows<{ name: string; n: number }>(sql`
      select coalesce(referrer, 'Direct') as name, count(distinct session_id)::int as n
      from pulse_events where kind = 'pageview' and ts >= ${start}::timestamptz and props->>'entry' = 'true'
      group by 1 order by n desc limit 8`),
    breakdown("country", start),
    breakdown("device", start),
    breakdown("browser", start),
    rows<{ name: string; n: number; path: string | null }>(sql`
      select name, mode() within group (order by path) as path, count(*)::int as n
      from pulse_events where kind = 'click' and ts >= ${start}::timestamptz group by name order by n desc limit 10`),
    one<{ landing: number; signup_page: number; signed_up: number; onboarded: number; first_entry: number }>(sql`
      select
        (select count(distinct visitor_id)::int from pulse_events where kind = 'pageview' and name = '/' and ts >= ${start}::timestamptz) as landing,
        (select count(distinct visitor_id)::int from pulse_events where kind = 'pageview' and name = '/sign-up' and ts >= ${start}::timestamptz) as signup_page,
        (select count(*)::int from "user" where created_at >= ${start}::timestamptz) as signed_up,
        (select count(*)::int from "user" u join user_settings s on s.user_id = u.id where u.created_at >= ${start}::timestamptz and s.onboarded_at is not null) as onboarded,
        (select count(*)::int from "user" u where u.created_at >= ${start}::timestamptz and exists (select 1 from transactions t where t.user_id = u.id)) as first_entry`),
    rows<{ source: string; n: number }>(sql`
      select source::text as source, count(*)::int as n from transactions where created_at >= ${start}::timestamptz group by 1 order by n desc`),
    rows<{ name: string; method: string | null; n: number }>(sql`
      select name, props->>'method' as method, count(*)::int as n
      from pulse_events where kind = 'auth' and ts >= ${start}::timestamptz group by 1, 2 order by n desc`),
  ]);

  return {
    kpis: {
      visitors: { now: traffic.v, before: traffic.v_prev },
      pageviews: { now: traffic.pv, before: traffic.pv_prev },
      sessions: { now: traffic.s, before: traffic.s_prev },
      signups: { now: people.signups, before: people.signups_prev },
      activeUsers: { now: people.active, before: people.active_prev },
      errors: { now: errors.n, before: errors.n_prev },
    },
    totalUsers: people.total,
    openIssues: errors.open,
    live: live.n,
    series,
    pages,
    referrers,
    countries,
    devices,
    browsers,
    clicks,
    funnel,
    entries,
    auth,
  };
}

function breakdown(column: "country" | "device" | "browser", start: string) {
  return rows<{ name: string; n: number }>(sql`
    select coalesce(${sql.identifier(column)}, 'Unknown') as name, count(distinct visitor_id)::int as n
    from pulse_events where kind = 'pageview' and ts >= ${start}::timestamptz group by 1 order by n desc limit 6`);
}

/* -------------------------------- users -------------------------------- */

export type PulseUserRow = {
  id: string;
  name: string;
  email: string;
  created_at: string;
  last_seen: string | null;
  sessions: number;
  entries: number;
  providers: string | null;
  onboarded: boolean;
  active7?: boolean;
};

export async function listPulseUsers() {
  return rows<PulseUserRow>(sql`
    select u.id, u.name, u.email, u.created_at,
      (select max(ts) from pulse_events e where e.user_id = u.id) as last_seen,
      (select count(distinct session_id)::int from pulse_events e where e.user_id = u.id and e.ts > now() - interval '30 days') as sessions,
      (select count(*)::int from transactions t where t.user_id = u.id and t.deleted_at is null) as entries,
      (select string_agg(distinct a.provider_id, ', ') from account a where a.user_id = u.id) as providers,
      coalesce((select s.onboarded_at is not null from user_settings s where s.user_id = u.id), false) as onboarded,
      exists (select 1 from pulse_events e where e.user_id = u.id and e.ts > now() - interval '7 days') as active7
    from "user" u
    order by last_seen desc nulls last, u.created_at desc
    limit 500`);
}

export type TimelineEvent = { ts: string; kind: string; name: string; path: string | null; value: number | null; props: Record<string, unknown> | null; device: string | null; browser: string | null; country: string | null };

export async function getPulseUser(id: string) {
  const user = await one<PulseUserRow>(sql`
    select u.id, u.name, u.email, u.created_at,
      (select max(ts) from pulse_events e where e.user_id = u.id) as last_seen,
      (select count(distinct session_id)::int from pulse_events e where e.user_id = u.id) as sessions,
      (select count(*)::int from transactions t where t.user_id = u.id and t.deleted_at is null) as entries,
      (select string_agg(distinct a.provider_id, ', ') from account a where a.user_id = u.id) as providers,
      coalesce((select s.onboarded_at is not null from user_settings s where s.user_id = u.id), false) as onboarded
    from "user" u where u.id = ${id}`);
  if (!user) return null;
  const [timeline, sources, errors, device] = await Promise.all([
    rows<TimelineEvent>(sql`
      select ts, kind, name, path, value, props, device, browser, country
      from pulse_events where user_id = ${id} order by ts desc limit 200`),
    rows<{ source: string; n: number }>(sql`
      select source::text as source, count(*)::int as n from transactions where user_id = ${id} and deleted_at is null group by 1 order by n desc`),
    rows<{ issue_id: string; message: string; ts: string; path: string | null }>(sql`
      select e.issue_id, i.message, e.ts, e.path from pulse_errors e join pulse_issues i on i.id = e.issue_id
      where e.user_id = ${id} order by e.ts desc limit 20`),
    one<{ device: string | null; browser: string | null; os: string | null; country: string | null }>(sql`
      select device, browser, os, country from pulse_events where user_id = ${id} and kind = 'pageview' order by ts desc limit 1`),
  ]);
  return { user, timeline, sources, errors, device };
}

/* ------------------------------- activity ------------------------------- */

export type ActivityRow = TimelineEvent & { id: number; user_id: string | null; user_name: string | null; visitor_id: string | null };

export async function getActivity(kind: string | null, limit = 150) {
  return rows<ActivityRow>(sql`
    select e.id, e.ts, e.kind, e.name, e.path, e.value, e.props, e.device, e.browser, e.country, e.user_id, e.visitor_id, u.name as user_name
    from pulse_events e left join "user" u on u.id = e.user_id
    where (${kind}::text is null or e.kind = ${kind})
    order by e.ts desc limit ${limit}`);
}

/* -------------------------------- errors -------------------------------- */

export type IssueRow = {
  id: string;
  source: string;
  name: string;
  message: string;
  culprit: string | null;
  status: string;
  count: number;
  first_seen: string;
  last_seen: string;
  users: number;
  recent: number;
};

export async function listIssues(status: string, range: PulseRange) {
  const { start } = bounds(range);
  return rows<IssueRow>(sql`
    select i.*,
      (select count(distinct coalesce(e.user_id, e.visitor_id))::int from pulse_errors e where e.issue_id = i.id) as users,
      (select count(*)::int from pulse_errors e where e.issue_id = i.id and e.ts >= ${start}::timestamptz) as recent
    from pulse_issues i
    where i.status = ${status}
    order by i.last_seen desc limit 200`);
}

export async function getIssue(id: string) {
  const issue = await one<IssueRow>(sql`
    select i.*,
      (select count(distinct coalesce(e.user_id, e.visitor_id))::int from pulse_errors e where e.issue_id = i.id) as users,
      0 as recent
    from pulse_issues i where i.id = ${id}`);
  if (!issue) return null;
  const [occurrences, byBrowser, byPath, daily] = await Promise.all([
    rows<{ id: number; ts: string; path: string | null; stack: string | null; props: Record<string, unknown> | null; browser: string | null; os: string | null; user_id: string | null; user_name: string | null }>(sql`
      select e.id, e.ts, e.path, e.stack, e.props, e.browser, e.os, e.user_id, u.name as user_name
      from pulse_errors e left join "user" u on u.id = e.user_id
      where e.issue_id = ${id} order by e.ts desc limit 30`),
    rows<{ name: string; n: number }>(sql`
      select coalesce(browser, 'Unknown') || ' · ' || coalesce(os, 'Unknown') as name, count(*)::int as n
      from pulse_errors where issue_id = ${id} group by 1 order by n desc limit 6`),
    rows<{ name: string; n: number }>(sql`
      select coalesce(path, 'Unknown') as name, count(*)::int as n from pulse_errors where issue_id = ${id} group by 1 order by n desc limit 6`),
    rows<{ day: string; n: number }>(sql`
      with b as (select generate_series(current_date - 13, current_date, interval '1 day')::date as day)
      select to_char(b.day, 'YYYY-MM-DD') as day, count(e.id)::int as n
      from b left join pulse_errors e on e.issue_id = ${id} and e.ts::date = b.day
      group by b.day order by b.day`),
  ]);
  return { issue, occurrences, byBrowser, byPath, daily };
}

/* -------------------------------- speed -------------------------------- */

export type Percentiles = { n: number; p50: number | null; p75: number | null; p95: number | null };

export async function getSpeed(range: PulseRange) {
  const { start } = bounds(range);
  const [vitals, vitalPages, voiceReady, voiceSessions, chat, token, tools] = await Promise.all([
    rows<{ name: string; n: number; p75: number; good: number; poor: number }>(sql`
      select name, count(*)::int as n,
        percentile_cont(0.75) within group (order by value) as p75,
        count(*) filter (where props->>'rating' = 'good')::int as good,
        count(*) filter (where props->>'rating' = 'poor')::int as poor
      from pulse_events where kind = 'vital' and ts >= ${start}::timestamptz and value is not null
      group by name`),
    rows<{ path: string; n: number; lcp: number | null; inp: number | null; fcp: number | null }>(sql`
      select path, count(*)::int as n,
        percentile_cont(0.75) within group (order by value) filter (where name = 'LCP') as lcp,
        percentile_cont(0.75) within group (order by value) filter (where name = 'INP') as inp,
        percentile_cont(0.75) within group (order by value) filter (where name = 'FCP') as fcp
      from pulse_events where kind = 'vital' and ts >= ${start}::timestamptz and path is not null
      group by path order by n desc limit 10`),
    rows<Percentiles & { warm: boolean | null; mic: number | null }>(sql`
      select (props->>'warm')::boolean as warm, count(*)::int as n,
        percentile_cont(0.5) within group (order by value) as p50,
        percentile_cont(0.75) within group (order by value) as p75,
        percentile_cont(0.95) within group (order by value) as p95,
        percentile_cont(0.5) within group (order by (props->>'micMs')::float) as mic
      from pulse_events where kind = 'event' and name = 'voice_ready' and ts >= ${start}::timestamptz
      group by 1 order by 1 desc nulls last`),
    one<{ n: number; failed: number; avg_seconds: number | null; turns: number | null }>(sql`
      select count(*)::int as n,
        count(*) filter (where props->>'failed' is not null and props->>'failed' <> '')::int as failed,
        avg(value) as avg_seconds,
        avg((props->>'turns')::float) as turns
      from pulse_events where kind = 'event' and name = 'voice_session' and ts >= ${start}::timestamptz`),
    one<Percentiles & { first_p50: number | null; tokens_in: number | null; tokens_out: number | null }>(sql`
      select count(*)::int as n,
        percentile_cont(0.5) within group (order by value) as p50,
        percentile_cont(0.75) within group (order by value) as p75,
        percentile_cont(0.95) within group (order by value) as p95,
        percentile_cont(0.5) within group (order by (props->>'firstChunkMs')::float) as first_p50,
        sum((props->>'inputTokens')::float) as tokens_in,
        sum((props->>'outputTokens')::float) as tokens_out
      from pulse_events where kind = 'event' and name = 'ai_chat' and ts >= ${start}::timestamptz`),
    one<Percentiles>(sql`
      select count(*)::int as n,
        percentile_cont(0.5) within group (order by value) as p50,
        percentile_cont(0.75) within group (order by value) as p75,
        percentile_cont(0.95) within group (order by value) as p95
      from pulse_events where kind = 'event' and name = 'voice_token' and ts >= ${start}::timestamptz`),
    rows<{ tool: string; n: number; p50: number; failed: number }>(sql`
      select props->>'tool' as tool, count(*)::int as n,
        percentile_cont(0.5) within group (order by value) as p50,
        count(*) filter (where props->>'ok' = 'false')::int as failed
      from pulse_events where kind = 'event' and name = 'voice_tool' and ts >= ${start}::timestamptz
      group by 1 order by n desc`),
  ]);
  return { vitals, vitalPages, voiceReady, voiceSessions, chat, token, tools };
}
