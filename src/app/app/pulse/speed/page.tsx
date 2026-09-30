import { Panel } from "@/components/app/page-header";
import { compact, ms, nf } from "@/components/pulse/bits";
import { RangeTabs } from "@/components/pulse/pulse-nav";
import { cn } from "@/lib/cn";
import { requirePulseAdmin } from "@/server/pulse/guard";
import { getSpeed, parseRange, type Percentiles } from "@/server/pulse/queries";

export const metadata = { title: "Speed" };

// Google's Core Web Vitals thresholds (good up to the first number, poor above the second).
const VITALS = [
  { name: "LCP", label: "Main content shows", good: 2500, poor: 4000 },
  { name: "INP", label: "Reacts to taps", good: 200, poor: 500 },
  { name: "CLS", label: "Layout stays still", good: 0.1, poor: 0.25 },
  { name: "FCP", label: "First paint", good: 1800, poor: 3000 },
  { name: "TTFB", label: "Server answers", good: 800, poor: 1800 },
] as const;

function rate(v: number | null | undefined, good: number, poor: number) {
  if (v == null) return null;
  return v <= good ? "Good" : v <= poor ? "Needs work" : "Poor";
}

function Rating({ r }: { r: string | null }) {
  if (!r) return null;
  return (
    <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-[12px] whitespace-nowrap", r === "Good" && "bg-lime", r === "Needs work" && "bg-ash", r === "Poor" && "bg-alert text-white")}>{r}</span>
  );
}

function Spread({ p, label }: { p: Percentiles | undefined; label?: string }) {
  return (
    <dl className="flex flex-wrap gap-x-8 gap-y-2">
      {label && <p className="w-full text-[13px] text-graphite">{label}</p>}
      {[
        ["Typical", p?.p50],
        ["Most (p75)", p?.p75],
        ["Slowest (p95)", p?.p95],
      ].map(([k, v]) => (
        <div key={k as string}>
          <dt className="text-[12px] text-graphite">{k}</dt>
          <dd className="text-[24px] leading-tight font-medium tracking-[-0.02em]">{ms(v as number | null)}</dd>
        </div>
      ))}
    </dl>
  );
}

export default async function PulseSpeed({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePulseAdmin();
  const range = parseRange((await searchParams).range);
  const s = await getSpeed(range);
  const warm = s.voiceReady.find((v) => v.warm === true);
  const cold = s.voiceReady.find((v) => v.warm !== true);

  return (
    <>
      <div className="flex justify-end">
        <RangeTabs current={range} basePath="/app/pulse/speed" />
      </div>

      <section>
        <h2 className="mb-3 px-1 text-[22px] font-medium">Page speed</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {VITALS.map((v) => {
            const row = s.vitals.find((x) => x.name === v.name);
            const p75 = row?.p75 ?? null;
            return (
              <div key={v.name} className="flex flex-col gap-2 rounded-[28px] bg-parchment p-5 sm:p-6">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] text-graphite">
                    {v.label} <span className="text-stone">({v.name})</span>
                  </span>
                  <Rating r={rate(p75, v.good, v.poor)} />
                </div>
                <span className="text-[34px] leading-[1.05] font-medium tracking-[-0.03em]">{p75 == null ? "–" : v.name === "CLS" ? p75.toFixed(2) : ms(p75)}</span>
                <span className="text-[13px] text-graphite">
                  {row ? `${Math.round((row.good / row.n) * 100)}% of ${nf.format(row.n)} visits good` : "No samples yet"}
                </span>
              </div>
            );
          })}
        </div>
        <p className="mt-3 px-1 text-[13px] text-graphite">Numbers are what 3 in 4 visits beat (p75), measured in real browsers.</p>
      </section>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Panel tone="dark" eyebrow="Voice" title="Time to connect">
          <div className="flex flex-col gap-6 [&_dd]:text-white [&_dt]:text-ash [&_p]:text-ash">
            <Spread p={warm} label={`Token ready in advance · ${nf.format(warm?.n ?? 0)} sessions`} />
            <Spread p={cold} label={`Token fetched on tap · ${nf.format(cold?.n ?? 0)} sessions`} />
          </div>
          <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-white/10 pt-5 text-[14px] sm:grid-cols-4">
            {[
              ["Mic ready", ms(warm?.mic ?? cold?.mic)],
              ["Sessions", nf.format(s.voiceSessions.n)],
              ["Avg length", s.voiceSessions.avg_seconds == null ? "–" : `${Math.round(s.voiceSessions.avg_seconds)} s`],
              ["Failed", nf.format(s.voiceSessions.failed)],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-[12px] text-ash">{k}</dt>
                <dd className="text-[20px] font-medium text-white">{v}</dd>
              </div>
            ))}
          </dl>
        </Panel>

        <Panel eyebrow="AI chat" title="Reply time">
          <Spread p={s.chat} label={`${nf.format(s.chat.n)} replies, start to finish`} />
          <dl className="mt-6 grid grid-cols-3 gap-4 border-t border-ash pt-5 text-[14px]">
            {[
              ["First words", ms(s.chat.first_p50)],
              ["Tokens in", s.chat.tokens_in ? compact(s.chat.tokens_in) : "0"],
              ["Tokens out", s.chat.tokens_out ? compact(s.chat.tokens_out) : "0"],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-[12px] text-graphite">{k}</dt>
                <dd className="text-[20px] font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Panel eyebrow="Voice server" title="Token and tool calls">
          <Spread p={s.token} label={`Minting a voice token · ${nf.format(s.token.n)} times`} />
          <ul className="mt-6 flex flex-col divide-y divide-ash border-t border-ash text-[14px]">
            {s.tools.length === 0 && <li className="py-3 text-graphite">No voice tool calls yet.</li>}
            {s.tools.map((t) => (
              <li key={t.tool} className="flex items-center justify-between gap-3 py-3">
                <span className="truncate">{t.tool.replaceAll("_", " ")}</span>
                <span className="tabular shrink-0 text-graphite">
                  {nf.format(t.n)} calls · <span className="font-medium text-ink">{ms(t.p50)}</span>
                  {t.failed > 0 && <span className="text-alert"> · {t.failed} failed</span>}
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel eyebrow="Pages" title="Speed by page">
          {s.vitalPages.length === 0 ? (
            <p className="text-[15px] text-graphite">No samples yet.</p>
          ) : (
            <div className="-mx-2 overflow-x-auto">
              <table className="w-full min-w-[420px] text-[14px]">
                <thead className="text-left text-[12px] text-graphite">
                  <tr>
                    <th className="px-2 pb-2 font-normal">Page</th>
                    <th className="px-2 pb-2 text-right font-normal">Content (LCP)</th>
                    <th className="px-2 pb-2 text-right font-normal">Taps (INP)</th>
                    <th className="px-2 pb-2 text-right font-normal">Samples</th>
                  </tr>
                </thead>
                <tbody className="tabular">
                  {s.vitalPages.map((p) => (
                    <tr key={p.path} className="border-t border-ash">
                      <td className="max-w-[180px] truncate px-2 py-2.5">{p.path}</td>
                      <td className={cn("px-2 py-2.5 text-right", rate(p.lcp, 2500, 4000) === "Poor" && "text-alert")}>{ms(p.lcp)}</td>
                      <td className={cn("px-2 py-2.5 text-right", rate(p.inp, 200, 500) === "Poor" && "text-alert")}>{ms(p.inp)}</td>
                      <td className="px-2 py-2.5 text-right text-graphite">{p.n}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
