import Link from "next/link";
import { notFound } from "next/navigation";
import { Panel } from "@/components/app/page-header";
import { ago, BarList, clock, nf } from "@/components/pulse/bits";
import { ArrowLink } from "@/components/ui/button";
import { requirePulseAdmin } from "@/server/pulse/guard";
import { getIssue } from "@/server/pulse/queries";
import { IssueActions } from "./issue-actions";

export const metadata = { title: "Error" };

const STATUS_TEXT: Record<string, string> = { open: "Open", resolved: "Resolved", ignored: "Ignored" };

export default async function PulseIssue({ params }: { params: Promise<{ id: string }> }) {
  const { settings } = await requirePulseAdmin();
  const data = await getIssue((await params).id);
  if (!data) notFound();
  const { issue, occurrences, byBrowser, byPath, daily } = data;
  const latest = occurrences[0];
  const peak = Math.max(...daily.map((d) => d.n), 1);

  return (
    <>
      <ArrowLink href="/app/pulse/errors" className="self-start">
        All errors
      </ArrowLink>

      <section className="flex flex-col gap-5 rounded-[28px] bg-parchment p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          <span className={issue.source === "server" ? "rounded-full bg-ink px-2.5 py-0.5 text-white" : "rounded-full bg-white px-2.5 py-0.5"}>{issue.source}</span>
          <span className="rounded-full border border-ash px-2.5 py-0.5">{STATUS_TEXT[issue.status] ?? issue.status}</span>
          <span className="text-graphite">
            {issue.name}
            {issue.culprit ? ` in ${issue.culprit}` : ""}
          </span>
        </div>
        <h2 className="max-w-[60ch] text-[clamp(1.375rem,2.4vw,1.75rem)] leading-[1.2] font-medium break-words">{issue.message}</h2>
        <dl className="flex flex-wrap gap-x-10 gap-y-3">
          {[
            ["Events", nf.format(issue.count)],
            ["People", nf.format(issue.users)],
            ["First seen", ago(issue.first_seen)],
            ["Last seen", ago(issue.last_seen)],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-[13px] text-graphite">{k}</dt>
              <dd className="text-[22px] font-medium">{v}</dd>
            </div>
          ))}
        </dl>
        <div>
          <p className="mb-2 text-[13px] text-graphite">Last 14 days</p>
          <div className="flex h-12 items-end gap-1" role="img" aria-label={`Events per day: ${daily.map((d) => d.n).join(", ")}`}>
            {daily.map((d) => (
              <div key={d.day} title={`${d.day}: ${d.n}`} className="flex-1 rounded-t-[3px] bg-ink" style={{ height: `${d.n ? Math.max(8, (d.n / peak) * 100) : 3}%`, opacity: d.n ? 1 : 0.15 }} />
            ))}
          </div>
        </div>
        <IssueActions id={issue.id} status={issue.status} />
      </section>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Panel tone="dark" eyebrow="Latest stack" title={latest ? clock(latest.ts, settings.timezone) : "No stack"} className="min-w-0 lg:col-span-2">
          {latest?.stack ? (
            <pre className="max-h-[420px] overflow-auto rounded-[18px] bg-black/25 p-4 font-mono text-[12px] leading-[1.6] whitespace-pre text-ash">{latest.stack}</pre>
          ) : (
            <p className="text-[15px] text-ash">This error came without a stack trace.</p>
          )}
          {latest?.props && (
            <dl className="mt-4 grid grid-cols-1 gap-2 text-[13px] sm:grid-cols-2">
              {Object.entries(latest.props)
                .filter(([, v]) => v !== null && v !== "")
                .map(([k, v]) => (
                  <div key={k} className="flex gap-2">
                    <dt className="text-ash">{k}</dt>
                    <dd className="truncate text-white">{String(v)}</dd>
                  </div>
                ))}
            </dl>
          )}
        </Panel>
        <div className="flex flex-col gap-3">
          <Panel eyebrow="Where" title="Pages">
            <BarList items={byPath.map((p) => ({ key: p.name, name: p.name, n: p.n }))} />
          </Panel>
          {byBrowser.some((b) => b.name !== "Unknown · Unknown") && (
            <Panel eyebrow="Who" title="Browsers">
              <BarList items={byBrowser.map((b) => ({ key: b.name, name: b.name, n: b.n }))} />
            </Panel>
          )}
        </div>
      </div>

      <Panel tone="white" eyebrow="Occurrences" title="Most recent 30">
        <ul className="flex flex-col divide-y divide-ash">
          {occurrences.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-[14px]">
              <span className="min-w-0 truncate">
                {o.user_id ? (
                  <Link href={`/app/pulse/users/${o.user_id}`} className="font-medium hover:underline">
                    {o.user_name ?? "User"}
                  </Link>
                ) : (
                  <span className="text-graphite">Visitor</span>
                )}
                <span className="text-graphite"> · {o.path ?? "unknown page"}</span>
              </span>
              <span className="text-[13px] text-graphite">
                {[o.browser, o.os].filter(Boolean).join(" · ")} · {clock(o.ts, settings.timezone)}
              </span>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}
