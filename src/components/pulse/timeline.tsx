import { clock, countryName, KindTag, ms } from "./bits";

type Row = {
  ts: string | Date;
  kind: string;
  name: string;
  path: string | null;
  value: number | null;
  props: Record<string, unknown> | null;
  device?: string | null;
  browser?: string | null;
  country?: string | null;
  user_name?: string | null;
  user_id?: string | null;
};

/** Human wording for one event row. */
export function describe(e: Row) {
  const p = e.props ?? {};
  switch (e.kind) {
    case "pageview":
      return { title: e.name, detail: p.entry ? `Visit started${e.country ? ` in ${countryName(e.country)}` : ""}${e.device ? ` on ${e.device}` : ""}` : null };
    case "click":
      return { title: `Clicked “${e.name}”`, detail: e.path };
    case "vital":
      return { title: `${e.name} ${e.name === "CLS" ? e.value : ms(e.value)}`, detail: `${String(p.rating ?? "")} · ${e.path ?? ""}` };
    case "auth":
      return { title: e.name.replaceAll("_", " "), detail: [p.method, p.reason].filter(Boolean).join(" · ") || null };
    default: {
      const extra = Object.entries(p)
        .filter(([, v]) => v !== null && v !== "")
        .slice(0, 5)
        .map(([k, v]) => `${k} ${typeof v === "number" && /ms$|Ms$/.test(k) ? ms(v) : String(v)}`)
        .join(" · ");
      const val = e.value == null ? "" : e.name === "voice_session" ? ` · ${e.value} s` : ` · ${ms(e.value)}`;
      return { title: `${e.name.replaceAll("_", " ")}${val}`, detail: extra || e.path };
    }
  }
}

export function Timeline({ rows, tz, showUser }: { rows: Row[]; tz: string; showUser?: boolean }) {
  if (!rows.length) return <p className="px-2 text-[15px] text-graphite">Nothing recorded yet.</p>;
  return (
    <ol className="flex flex-col divide-y divide-ash">
      {rows.map((e, i) => {
        const d = describe(e);
        return (
          <li key={i} className="flex items-start gap-3 py-3">
            <KindTag kind={e.kind} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14px]">{d.title}</div>
              {(d.detail || (showUser && e.user_name)) && (
                <div className="truncate text-[12px] text-graphite">
                  {showUser && (e.user_name ? `${e.user_name} · ` : "Visitor · ")}
                  {d.detail}
                </div>
              )}
            </div>
            <time className="shrink-0 text-[12px] text-graphite" dateTime={new Date(e.ts).toISOString()}>
              {clock(e.ts, tz)}
            </time>
          </li>
        );
      })}
    </ol>
  );
}
