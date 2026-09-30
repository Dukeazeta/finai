"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { TxRow } from "@/components/app/tx-row";
import { Button } from "@/components/ui/button";
import type { TxRowData } from "@/lib/tx-types";
import { deleteTransactions, restoreTransactionAction } from "@/server/actions";

function dayLabel(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function TxList({ rows }: { rows: TxRowData[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [undo, setUndo] = useState<string[] | null>(null);
  const [pending, start] = useTransition();

  const groups = new Map<string, TxRowData[]>();
  for (const r of rows) groups.set(r.date, [...(groups.get(r.date) ?? []), r]);

  function toggle(id: string, v: boolean) {
    setSelected((s) => {
      const n = new Set(s);
      if (v) n.add(id);
      else n.delete(id);
      return n;
    });
  }

  return (
    <div>
      <div className="sticky top-[72px] z-10 flex min-h-12 flex-wrap items-center gap-3 bg-white py-2">
        <label className="flex items-center gap-2 text-[14px]">
          <input
            type="checkbox"
            className="size-4 accent-ink"
            checked={selected.size > 0 && selected.size === rows.length}
            ref={(el) => {
              if (el) el.indeterminate = selected.size > 0 && selected.size < rows.length;
            }}
            onChange={(e) => setSelected(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())}
          />
          {selected.size ? `${selected.size} selected` : "Select"}
        </label>
        {selected.size > 0 && (
          <Button
            size="sm"
            variant="danger"
            loading={pending}
            onClick={() =>
              start(async () => {
                const ids = [...selected];
                const res = await deleteTransactions(ids);
                if (res.ok) {
                  setUndo(ids);
                  setSelected(new Set());
                  router.refresh();
                }
              })
            }
          >
            Delete {selected.size}
          </Button>
        )}
        {undo && (
          <div role="status" className="ml-auto flex items-center gap-3 rounded-full bg-parchment py-1.5 pr-2 pl-4 text-[14px]">
            <span>
              Deleted {undo.length} {undo.length === 1 ? "entry" : "entries"}.
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                start(async () => {
                  await Promise.all(undo.map((id) => restoreTransactionAction(id)));
                  setUndo(null);
                  router.refresh();
                })
              }
            >
              Undo
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {[...groups.entries()].map(([date, items]) => (
          <section key={date} className="rounded-[28px] bg-parchment px-5 pt-5 pb-2 sm:px-7">
            <h2 className="eyebrow text-graphite">{dayLabel(date)}</h2>
            <ul className="mt-1 divide-y divide-ash">
              {items.map((tx) => (
                <TxRow key={tx.id} tx={tx} selectable selected={selected.has(tx.id)} onSelect={(v) => toggle(tx.id, v)} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
