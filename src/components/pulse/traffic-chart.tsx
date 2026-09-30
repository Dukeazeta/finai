"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";

// Same charcoal island and lime/stone pair as the cash flow chart (validated there: CVD ΔE 30.7).
const A = "#beff50";
const B = "#919183";

type Point = { bucket: string; visitors: number; views: number };

function label(bucket: string, long = false) {
  const [date, hour] = bucket.split(" ");
  const [y, m, d] = date.split("-").map(Number);
  if (hour) return long ? `${d} ${new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)))}, ${hour}` : hour;
  return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: long ? "long" : "short" }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function TrafficChart({ data }: { data: Point[] }) {
  const [asTable, setAsTable] = useState(false);
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-ash">
        <span className="inline-flex items-center gap-2">
          <span className="size-2.5 rounded-[3px]" style={{ background: A }} aria-hidden />
          Visitors
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-2.5 rounded-[3px]" style={{ background: B }} aria-hidden />
          Page views
        </span>
        <button type="button" onClick={() => setAsTable((v) => !v)} className="ml-auto border-b border-white/60 text-[13px] text-white">
          {asTable ? "Show chart" : "Show as table"}
        </button>
      </div>
      {asTable ? (
        <div className="max-h-[260px] overflow-y-auto rounded-[18px] bg-white/5">
          <table className="w-full text-[14px] text-white">
            <thead className="sticky top-0 bg-charcoal text-left text-ash">
              <tr>
                <th className="px-4 py-2.5 font-normal">When</th>
                <th className="px-4 py-2.5 text-right font-normal">Visitors</th>
                <th className="px-4 py-2.5 text-right font-normal">Page views</th>
              </tr>
            </thead>
            <tbody className="tabular">
              {data
                .filter((r) => r.views)
                .map((r) => (
                  <tr key={r.bucket} className="border-t border-white/10">
                    <td className="px-4 py-2.5">{label(r.bucket, true)}</td>
                    <td className="px-4 py-2.5 text-right">{r.visitors}</td>
                    <td className="px-4 py-2.5 text-right">{r.views}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="h-[240px] w-full" role="img" aria-label="Visitors and page views over time. Use Show as table for the numbers.">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barGap={2} barCategoryGap="22%" margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.08)" />
              <XAxis
                dataKey="bucket"
                tickFormatter={(b: string) => label(b)}
                interval="preserveStartEnd"
                minTickGap={28}
                tickLine={false}
                axisLine={{ stroke: "rgba(255,255,255,0.18)" }}
                tick={{ fill: "#d2d2c8", fontSize: 12 }}
                tickMargin={8}
              />
              <YAxis width={36} allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "#d2d2c8", fontSize: 12 }} />
              <Tooltip cursor={{ fill: "rgba(255,255,255,0.06)" }} content={(p) => <TrafficTooltip {...p} />} />
              <Bar dataKey="visitors" name="Visitors" fill={A} radius={[4, 4, 0, 0]} maxBarSize={22} />
              <Bar dataKey="views" name="Page views" fill={B} radius={[4, 4, 0, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function TrafficTooltip({ active, payload, label: l }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as Point;
  return (
    <div className="rounded-[12px] border border-ash bg-white px-3.5 py-3 text-[13px] text-ink">
      <div className="mb-1.5 text-graphite">{label(String(l), true)}</div>
      {[
        { name: "Visitors", color: A, v: row.visitors },
        { name: "Page views", color: B, v: row.views },
      ].map((s) => (
        <div key={s.name} className="flex items-center gap-2">
          <span className="h-[3px] w-3 rounded-full" style={{ background: s.color }} aria-hidden />
          <span className="tabular font-medium">{s.v}</span>
          <span className="text-graphite">{s.name}</span>
        </div>
      ))}
    </div>
  );
}
