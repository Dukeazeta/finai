import Link from "next/link";
import { notFound } from "next/navigation";
import { Panel } from "@/components/app/page-header";
import { ago, countryName } from "@/components/pulse/bits";
import { Timeline } from "@/components/pulse/timeline";
import { ArrowLink } from "@/components/ui/button";
import { requirePulseAdmin } from "@/server/pulse/guard";
import { getPulseUser } from "@/server/pulse/queries";

export const metadata = { title: "User" };

const SOURCE_LABELS: Record<string, string> = { manual: "By hand", chat: "Chat", voice: "Voice", recurring: "Recurring" };

export default async function PulseUser({ params }: { params: Promise<{ id: string }> }) {
  const { settings } = await requirePulseAdmin();
  const data = await getPulseUser((await params).id);
  if (!data) notFound();
  const { user, timeline, sources, errors, device } = data;

  const facts = [
    ["Joined", ago(user.created_at)],
    ["Last seen", ago(user.last_seen)],
    ["Visits", String(user.sessions)],
    ["Entries", String(user.entries)],
    ["Signs in with", user.providers?.replace("credential", "email") ?? "Unknown"],
    ["Onboarded", user.onboarded ? "Yes" : "Not yet"],
    ["Last device", device ? [device.device, device.browser, device.os].filter(Boolean).join(" · ") : "Unknown"],
    ["Country", device?.country ? countryName(device.country) : "Unknown"],
  ];

  return (
    <>
      <ArrowLink href="/app/pulse/users" className="self-start">
        All users
      </ArrowLink>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="flex flex-col gap-3">
          <Panel eyebrow="Person" title={user.name || "No name"}>
            <p className="-mt-4 mb-5 truncate text-[14px] text-graphite">{user.email}</p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              {facts.map(([k, v]) => (
                <div key={k} className="min-w-0">
                  <dt className="text-[12px] text-graphite">{k}</dt>
                  <dd className="truncate text-[14px] font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </Panel>
          <Panel eyebrow="Entries" title="How they log">
            {sources.length === 0 ? (
              <p className="text-[15px] text-graphite">No entries yet.</p>
            ) : (
              <ul className="flex flex-col gap-2 text-[15px]">
                {sources.map((s) => (
                  <li key={s.source} className="flex justify-between">
                    <span>{SOURCE_LABELS[s.source] ?? s.source}</span>
                    <span className="tabular font-medium">{s.n}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          {errors.length > 0 && (
            <Panel eyebrow="Errors" title="Problems they hit">
              <ul className="flex flex-col gap-3">
                {errors.map((e, i) => (
                  <li key={i}>
                    <Link href={`/app/pulse/errors/${e.issue_id}`} className="block text-[14px] hover:underline">
                      <span className="line-clamp-2 text-alert">{e.message}</span>
                      <span className="text-[12px] text-graphite">
                        {ago(e.ts)} · {e.path}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
        <Panel tone="white" eyebrow="Timeline" title="What they did, newest first" className="lg:col-span-2">
          <Timeline rows={timeline} tz={settings.timezone} />
        </Panel>
      </div>
    </>
  );
}
