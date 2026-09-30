import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ago, nf } from "@/components/pulse/bits";
import { LinkPending } from "@/components/ui/link-pending";
import { requirePulseAdmin } from "@/server/pulse/guard";
import { listPulseUsers } from "@/server/pulse/queries";

export const metadata = { title: "Users" };

export default async function PulseUsers() {
  await requirePulseAdmin();
  const users = await listPulseUsers();
  const active7 = users.filter((u) => u.active7).length;

  return (
    <section className="rounded-[28px] bg-parchment p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 px-2">
        <h2 className="text-[22px] font-medium">{nf.format(users.length)} accounts</h2>
        <p className="text-[14px] text-graphite">{nf.format(active7)} active in the last 7 days</p>
      </div>
      <div className="hidden grid-cols-[minmax(0,2fr)_1fr_1fr_90px_90px_24px] gap-4 px-4 pb-2 text-[13px] text-graphite md:grid">
        <span>Person</span>
        <span>Joined</span>
        <span>Last seen</span>
        <span className="text-right">Visits (30d)</span>
        <span className="text-right">Entries</span>
        <span />
      </div>
      <ul className="flex flex-col gap-1.5">
        {users.map((u) => (
          <li key={u.id}>
            <Link
              href={`/app/pulse/users/${u.id}`}
              className="grid grid-cols-[minmax(0,1fr)_24px] items-center gap-x-4 gap-y-1 rounded-[18px] bg-white px-4 py-3.5 transition-colors hover:bg-[#fbfbf6] md:grid-cols-[minmax(0,2fr)_1fr_1fr_90px_90px_24px]"
            >
              <span className="min-w-0">
                <span className="block truncate text-[15px] font-medium">{u.name || "No name"}</span>
                <span className="block truncate text-[13px] text-graphite">
                  {u.email}
                  {u.providers ? ` · ${u.providers.replace("credential", "email")}` : ""}
                  {!u.onboarded ? " · not onboarded" : ""}
                </span>
              </span>
              <ChevronRight className="size-4 text-graphite md:hidden" strokeWidth={1.75} aria-hidden />
              <span className="col-span-2 text-[13px] text-graphite md:col-span-1 md:text-[14px] md:text-ink">
                <span className="md:hidden">Joined </span>
                {ago(u.created_at)}
                <span className="md:hidden"> · last seen {ago(u.last_seen)} · {u.entries} entries</span>
              </span>
              <span className="hidden text-[14px] md:block">{ago(u.last_seen)}</span>
              <span className="tabular hidden text-right text-[14px] md:block">{u.sessions}</span>
              <span className="tabular hidden text-right text-[14px] md:block">{u.entries}</span>
              <ChevronRight className="hidden size-4 text-graphite md:block" strokeWidth={1.75} aria-hidden />
              <LinkPending />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
