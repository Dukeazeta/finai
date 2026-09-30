import Link from "next/link";
import { AutoRefresh } from "@/components/pulse/auto-refresh";
import { Timeline } from "@/components/pulse/timeline";
import { LinkPending } from "@/components/ui/link-pending";
import { cn } from "@/lib/cn";
import { requirePulseAdmin } from "@/server/pulse/guard";
import { getActivity } from "@/server/pulse/queries";

export const metadata = { title: "Activity" };

const KINDS = [
  [null, "Everything"],
  ["pageview", "Page views"],
  ["click", "Clicks"],
  ["auth", "Sign ins"],
  ["event", "Product events"],
  ["vital", "Speed samples"],
] as const;

export default async function PulseActivity({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { settings } = await requirePulseAdmin();
  const raw = (await searchParams).kind;
  const kind = KINDS.find(([k]) => k === raw)?.[0] ?? null;
  const rows = await getActivity(kind);

  return (
    <>
      <AutoRefresh seconds={10} />
      <div className="flex flex-wrap gap-1.5">
        {KINDS.map(([k, label]) => (
          <Link
            key={label}
            href={k ? `/app/pulse/activity?kind=${k}` : "/app/pulse/activity"}
            scroll={false}
            aria-current={k === kind ? "page" : undefined}
            className={cn("rounded-full border px-3.5 py-1.5 text-[13px]", k === kind ? "border-ink bg-ink text-white" : "border-ash hover:border-ink")}
          >
            {label}
            <LinkPending />
          </Link>
        ))}
      </div>
      <section className="rounded-[28px] border border-ash bg-white px-4 py-2 sm:px-6">
        <p className="pt-3 text-[13px] text-graphite">Latest {rows.length} events. Updates every 10 seconds.</p>
        <Timeline rows={rows} tz={settings.timezone} showUser />
      </section>
    </>
  );
}
