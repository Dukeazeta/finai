import Link from "next/link";
import { ago, nf } from "@/components/pulse/bits";
import { EmptyState } from "@/components/app/page-header";
import { LinkPending } from "@/components/ui/link-pending";
import { cn } from "@/lib/cn";
import { requirePulseAdmin } from "@/server/pulse/guard";
import { listIssues, parseRange } from "@/server/pulse/queries";
import { TestErrors } from "./test-errors";

export const metadata = { title: "Errors" };

const STATUSES = [
  ["open", "Open"],
  ["resolved", "Resolved"],
  ["ignored", "Ignored"],
] as const;

export default async function PulseErrors({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePulseAdmin();
  const sp = await searchParams;
  const status = STATUSES.find(([s]) => s === sp.status)?.[0] ?? "open";
  const range = parseRange(sp.range);
  const issues = await listIssues(status, range);

  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5">
        {STATUSES.map(([s, label]) => (
          <Link
            key={s}
            href={`/app/pulse/errors?status=${s}`}
            scroll={false}
            aria-current={s === status ? "page" : undefined}
            className={cn("rounded-full border px-3.5 py-1.5 text-[13px]", s === status ? "border-ink bg-ink text-white" : "border-ash hover:border-ink")}
          >
            {label}
            <LinkPending />
          </Link>
        ))}
        <div className="ml-auto">
          <TestErrors />
        </div>
      </div>

      {issues.length === 0 ? (
        <EmptyState
          title={status === "open" ? "No open errors" : `Nothing ${status}`}
          body={status === "open" ? "When something breaks in a browser or on the server, it shows up here, grouped with others like it." : "Issues you mark this way will be listed here."}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {issues.map((i) => (
            <li key={i.id}>
              <Link href={`/app/pulse/errors/${i.id}`} className="flex flex-col gap-3 rounded-[28px] bg-parchment p-5 transition-colors hover:bg-[#ededdf] sm:flex-row sm:items-center sm:gap-6 sm:px-6">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn("rounded-full px-2.5 py-0.5 text-[12px]", i.source === "server" ? "bg-ink text-white" : "bg-white")}>{i.source}</span>
                    <span className="truncate text-[13px] text-graphite">
                      {i.name}
                      {i.culprit ? ` in ${i.culprit}` : ""}
                    </span>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-[16px] font-medium">{i.message}</p>
                  <p className="mt-1 text-[13px] text-graphite">
                    Last seen {ago(i.last_seen)} · first seen {ago(i.first_seen)}
                  </p>
                </div>
                <dl className="flex shrink-0 gap-6 text-right">
                  <div>
                    <dt className="text-[12px] text-graphite">Events</dt>
                    <dd className="tabular text-[22px] font-medium">{nf.format(i.count)}</dd>
                  </div>
                  <div>
                    <dt className="text-[12px] text-graphite">People</dt>
                    <dd className="tabular text-[22px] font-medium">{nf.format(i.users)}</dd>
                  </div>
                </dl>
                <LinkPending />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
