"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import { formatMoney, toMajor } from "@/lib/money";

// On the charcoal island (#30302a). Validated with the dataviz checker: CVD ΔE 30.7, contrast ≥ 3:1.
// Lime sits above the checker's lightness band by brand choice; relief is the legend, tooltip and table view.
const IN = "#beff50";
const OUT = "#919183";

type Point = { bucket: string; incomeMinor: number; expenseMinor: number };

function bucketLabel(bucket: string, long = false) {
  const [y, m, d] = bucket.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d ?? 1));
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    ...(d ? { day: "numeric", month: long ? "long" : "short" } : { month: long ? "long" : "short", year: long ? "numeric" : undefined }),
  }).format(date);
}

export function CashflowChart({ data, currency }: { data: Point[]; currency: string }) {
  const [asTable, setAsTable] = useState(false);
  const rows = data.map((p) => ({ ...p, income: toMajor(p.incomeMinor, currency), expense: toMajor(p.expenseMinor, currency) }));
  const daily = data[0]?.bucket.length === 10;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-ash">
        <span className="inline-flex items-center gap-2">
          <span className="size-2.5 rounded-[3px]" style={{ background: IN }} aria-hidden />
          Money in
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-2.5 rounded-[3px]" style={{ background: OUT }} aria-hidden />
          Money out
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
                <th className="px-4 py-2.5 font-normal">{daily ? "Day" : "Month"}</th>
                <th className="px-4 py-2.5 text-right font-normal">In</th>
                <th className="px-4 py-2.5 text-right font-normal">Out</th>
              </tr>
            </thead>
            <tbody className="tabular">
              {rows
                .filter((r) => r.incomeMinor || r.expenseMinor)
                .map((r) => (
                  <tr key={r.bucket} className="border-t border-white/10">
                    <td className="px-4 py-2.5">{bucketLabel(r.bucket)}</td>
                    <td className="px-4 py-2.5 text-right">{formatMoney(r.incomeMinor, currency)}</td>
                    <td className="px-4 py-2.5 text-right">{formatMoney(r.expenseMinor, currency)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="h-[240px] w-full" role="img" aria-label="Money in and out over time. Use Show as table for the numbers.">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} barGap={2} barCategoryGap={daily ? "18%" : "28%"} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.08)" />
              <XAxis
                dataKey="bucket"
                tickFormatter={(b: string) => bucketLabel(b)}
                interval="preserveStartEnd"
                minTickGap={28}
                tickLine={false}
                axisLine={{ stroke: "rgba(255,255,255,0.18)" }}
                tick={{ fill: "#d2d2c8", fontSize: 12 }}
                tickMargin={8}
              />
              <YAxis
                width={52}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#d2d2c8", fontSize: 12 }}
                tickFormatter={(v: number) => new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(v)}
              />
              <Tooltip cursor={{ fill: "rgba(255,255,255,0.06)" }} content={(p) => <ChartTooltip {...p} currency={currency} />} />
              <Bar dataKey="income" name="Money in" fill={IN} radius={[4, 4, 0, 0]} maxBarSize={24} />
              <Bar dataKey="expense" name="Money out" fill={OUT} radius={[4, 4, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function ChartTooltip({ active, payload, label, currency }: TooltipContentProps & { currency: string }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as { incomeMinor: number; expenseMinor: number };
  return (
    <div className="rounded-[12px] border border-ash bg-white px-3.5 py-3 text-[13px] text-ink">
      <div className="mb-1.5 text-graphite">{bucketLabel(String(label), true)}</div>
      {[
        { name: "Money in", color: IN, v: row.incomeMinor },
        { name: "Money out", color: OUT, v: row.expenseMinor },
      ].map((s) => (
        <div key={s.name} className="flex items-center gap-2">
          <span className="h-[3px] w-3 rounded-full" style={{ background: s.color }} aria-hidden />
          <span className="tabular font-medium">{formatMoney(s.v, currency)}</span>
          <span className="text-graphite">{s.name}</span>
        </div>
      ))}
    </div>
  );
}
