import Link from "next/link";
import { Panel } from "@/components/app/page-header";
import { AutoRefresh } from "@/components/pulse/auto-refresh";
import { BarList, countryName, nf, Stat } from "@/components/pulse/bits";
import { RangeTabs } from "@/components/pulse/pulse-nav";
import { TrafficChart } from "@/components/pulse/traffic-chart";
import { ArrowLink } from "@/components/ui/button";
import { requirePulseAdmin } from "@/server/pulse/guard";
import { getOverview, parseRange, RANGE_LABELS } from "@/server/pulse/queries";

export const metadata = { title: "Overview" };

const AUTH_LABELS: Record<string, string> = {
  sign_in: "Signed in",
  sign_up: "Signed up",
  sign_in_failed: "Failed sign in",
  sign_up_failed: "Failed sign up",
  sign_out: "Signed out",
  password_reset: "Reset password",
};
const SOURCE_LABELS: Record<string, string> = { manual: "By hand", chat: "Chat", voice: "Voice", recurring: "Recurring" };

export default async function PulseOverview({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { settings } = await requirePulseAdmin();
  const range = parseRange((await searchParams).range);
  const o = await getOverview(range, settings.timezone);
  const f = o.funnel;
  const steps = [
    { name: "Saw the landing page", n: f.landing },
    { name: "Opened sign up", n: f.signup_page },
    { name: "Created an account", n: f.signed_up },
    { name: "Finished onboarding", n: f.onboarded },
    { name: "Logged a first entry", n: f.first_entry },
  ];
  const top = Math.max(steps[0].n, 1);

  return (
    <>
      <AutoRefresh seconds={30} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="inline-flex items-center gap-2.5 text-[15px]">
          <span className="relative inline-flex size-2.5">
            {o.live > 0 && <span className="absolute inset-0 animate-ping rounded-full bg-lime" aria-hidden />}
            <span className={`relative inline-flex size-2.5 rounded-full ${o.live > 0 ? "bg-[#7ccc12]" : "bg-ash"}`} aria-hidden />
          </span>
          <span>
            <span className="font-medium">{o.live}</span> {o.live === 1 ? "visitor" : "visitors"} in the last 5 minutes
          </span>
        </p>
        <RangeTabs current={range} basePath="/app/pulse" />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Visitors" {...o.kpis.visitors} />
        <Stat label="Page views" {...o.kpis.pageviews} />
        <Stat label="Visits" {...o.kpis.sessions} />
        <Stat label="Sign-ups" {...o.kpis.signups} />
        <Stat label="Active users" {...o.kpis.activeUsers} />
        <Stat label="Errors" {...o.kpis.errors} upIsBad />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Panel tone="dark" eyebrow="Traffic" title={`Last ${RANGE_LABELS[range]}`} className="lg:col-span-2">
          <TrafficChart data={o.series} />
        </Panel>
        <Panel eyebrow="Funnel" title="From visit to first entry">
          <ol className="flex flex-col gap-3.5">
            {steps.map((s, i) => (
              <li key={s.name}>
                <div className="flex items-baseline justify-between gap-3 text-[14px]">
                  <span>{s.name}</span>
                  <span className="tabular shrink-0">
                    <span className="font-medium">{nf.format(s.n)}</span>
                    {i > 0 && <span className="ml-2 text-graphite">{Math.round((s.n / top) * 100)}%</span>}
                  </span>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-white">
                  <div className="h-full rounded-full bg-lime" style={{ width: `${Math.max(2, Math.min(100, (s.n / top) * 100))}%` }} />
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-5 text-[13px] text-graphite">
            The first two steps count visitors; the rest count accounts created in this period. {nf.format(o.totalUsers)} accounts in total.
          </p>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Panel eyebrow="Pages" title="Most viewed">
          <BarList items={o.pages.map((p) => ({ key: p.name, name: p.name, n: p.views, sub: `${nf.format(p.visitors)} visitors` }))} empty="No page views yet." />
        </Panel>
        <Panel eyebrow="Sources" title="Where visits start">
          <BarList items={o.referrers.map((r) => ({ key: r.name, name: r.name, n: r.n }))} empty="No visits yet." />
        </Panel>
        <Panel eyebrow="Places" title="Countries">
          <BarList items={o.countries.map((c) => ({ key: c.name, name: countryName(c.name), n: c.n }))} empty="No visits yet." />
          <p className="mt-4 text-[12px] text-graphite">Countries come from Vercel, so local visits show as Unknown.</p>
        </Panel>
        <Panel eyebrow="Clicks" title="What people press">
          <BarList items={o.clicks.map((c) => ({ key: c.name, name: c.name, n: c.n, sub: c.path ?? undefined }))} empty="No clicks yet." />
        </Panel>
        <Panel eyebrow="Devices" title="Phones and computers">
          <BarList items={o.devices.map((d) => ({ key: d.name, name: d.name[0].toUpperCase() + d.name.slice(1), n: d.n }))} empty="No visits yet." />
          <div className="mt-6">
            <BarList items={o.browsers.map((b) => ({ key: b.name, name: b.name, n: b.n }))} />
          </div>
        </Panel>
        <Panel eyebrow="Accounts" title="Sign ins and entries" action={<ArrowLink href={`/app/pulse/users?range=${range}`}>Users</ArrowLink>}>
          <BarList
            items={o.auth.map((a) => ({ key: `${a.name}${a.method}`, name: `${AUTH_LABELS[a.name] ?? a.name}${a.method ? ` · ${a.method}` : ""}`, n: a.n }))}
            empty="No sign ins in this period."
          />
          <p className="eyebrow mt-6 mb-3 text-graphite">Entries logged</p>
          <BarList items={o.entries.map((e) => ({ key: e.source, name: SOURCE_LABELS[e.source] ?? e.source, n: e.n }))} empty="No entries in this period." />
        </Panel>
      </div>

      {o.openIssues > 0 && (
        <Link href="/app/pulse/errors" className="flex items-center justify-between gap-3 rounded-[28px] bg-ink px-6 py-5 text-white">
          <span>
            <span className="font-medium">{o.openIssues}</span> open {o.openIssues === 1 ? "error needs" : "errors need"} a look
          </span>
          <span className="text-lime">Open errors →</span>
        </Link>
      )}
    </>
  );
}
