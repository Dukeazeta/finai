"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useApp } from "@/components/app/app-context";
import { EmptyState } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/ui/category-icon";
import { Field, FormError, Input, Select } from "@/components/ui/field";
import { Money } from "@/components/ui/money";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/cn";
import { CURRENCIES } from "@/lib/currencies";
import { toMajor } from "@/lib/money";
import { payRecurring, removeRecurring, saveRecurring } from "@/server/actions";

export type Rec = {
  id: string;
  name: string;
  type: "income" | "expense";
  amountMinor: number;
  currency: string;
  categoryId: string | null;
  categoryIcon: string | null;
  accountId: string | null;
  cadence: "weekly" | "monthly" | "yearly";
  nextDue: string;
  daysUntil: number;
};

function dueLabel(days: number) {
  if (days < 0) return `${-days} ${days === -1 ? "day" : "days"} overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `In ${days} days`;
}

export function RecurringView({ items }: { items: Rec[] }) {
  const [editing, setEditing] = useState<Rec | null>(null);
  const [open, setOpen] = useState(false);
  const openNew = () => {
    setEditing(null);
    setOpen(true);
  };

  return (
    <>
      {items.length === 0 ? (
        <EmptyState
          title="Nothing repeating yet"
          body="Add rent, subscriptions or your salary so you can see what's coming. When one is paid, mark it and FinAI logs it for you."
          action={
            <Button chevron onClick={openNew}>
              New bill or income
            </Button>
          }
        />
      ) : (
        <>
          <div className="flex justify-end">
            <Button chevron onClick={openNew}>
              New bill or income
            </Button>
          </div>
          <ul className="flex flex-col gap-3">
            {items.map((r) => (
              <RecurringRow
                key={r.id}
                r={r}
                onEdit={() => {
                  setEditing(r);
                  setOpen(true);
                }}
              />
            ))}
          </ul>
        </>
      )}
      <RecurringSheet key={`${editing?.id ?? "new"}-${open}`} open={open} onClose={() => setOpen(false)} item={editing} />
    </>
  );
}

function RecurringRow({ r, onEdit }: { r: Rec; onEdit: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  return (
    <li className="flex flex-wrap items-center gap-4 rounded-[28px] bg-parchment px-5 py-4 sm:px-7">
      <button type="button" onClick={onEdit} className="group flex min-w-0 flex-1 items-center gap-3 text-left">
        <CategoryIcon name={r.categoryIcon ?? "repeat"} tone="white" />
        <div className="min-w-0">
          <div className="truncate font-medium group-hover:underline">{r.name}</div>
          <div className={cn("eyebrow", r.daysUntil < 0 ? "text-alert" : "text-graphite")}>
            {dueLabel(r.daysUntil)} · {r.cadence}
          </div>
        </div>
      </button>
      <Money minor={r.amountMinor} currency={r.currency} type={r.type} className="text-[17px] font-medium" />
      <Button
        size="sm"
        variant={done ? "ghost" : "outline"}
        loading={pending}
        disabled={done}
        onClick={() =>
          start(async () => {
            const res = await payRecurring(r.id);
            if (res.ok) {
              setDone(true);
              router.refresh();
            }
          })
        }
      >
        {done ? "Logged" : r.type === "income" ? "Mark received" : "Mark paid"}
      </Button>
    </li>
  );
}

function RecurringSheet({ open, onClose, item }: { open: boolean; onClose: () => void; item: Rec | null }) {
  const router = useRouter();
  const { categories, accounts, baseCurrency, timezone } = useApp();
  const [type, setType] = useState<"income" | "expense">(item?.type ?? "expense");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [removing, startRemove] = useTransition();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date());

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={item ? item.name : "New bill or income"}
      footer={
        <div className="flex items-center gap-2.5">
          {item && (
            <Button
              variant="danger"
              loading={removing}
              onClick={() =>
                startRemove(async () => {
                  await removeRecurring(item.id);
                  onClose();
                  router.refresh();
                })
              }
            >
              Remove
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="recurring-form" loading={pending}>
            Save
          </Button>
        </div>
      }
    >
      <form
        id="recurring-form"
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          setError(null);
          start(async () => {
            const res = await saveRecurring(item?.id ?? null, {
              name: String(f.get("name")),
              type,
              amount: String(f.get("amount")).replaceAll(",", ""),
              currency: String(f.get("currency")),
              categoryId: String(f.get("category") || "") || null,
              accountId: String(f.get("account") || "") || null,
              cadence: String(f.get("cadence")) as Rec["cadence"],
              nextDue: String(f.get("nextDue")),
            });
            if (!res.ok) return setError(res.error);
            onClose();
            router.refresh();
          });
        }}
      >
        <div role="radiogroup" aria-label="Type" className="grid grid-cols-2 gap-1 rounded-full bg-parchment p-1.5">
          {(["expense", "income"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={type === t}
              onClick={() => setType(t)}
              className={cn("h-9 rounded-full text-[14px]", type === t ? "bg-lime font-medium" : "hover:bg-white")}
            >
              {t === "expense" ? "Bill" : "Income"}
            </button>
          ))}
        </div>
        <Field label="Name">{(id) => <Input id={id} name="name" defaultValue={item?.name} placeholder={type === "expense" ? "Rent, Netflix, DSTV…" : "Salary"} required />}</Field>
        <div className="grid grid-cols-[1fr_112px] gap-3">
          <Field label="Amount">
            {(id) => <Input id={id} name="amount" inputMode="decimal" required defaultValue={item ? String(toMajor(item.amountMinor, item.currency)) : ""} className="tabular" />}
          </Field>
          <Field label="Currency">
            {(id) => (
              <Select id={id} name="currency" defaultValue={item?.currency ?? baseCurrency}>
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Repeats">
            {(id) => (
              <Select id={id} name="cadence" defaultValue={item?.cadence ?? "monthly"}>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </Select>
            )}
          </Field>
          <Field label="Next due">{(id) => <Input id={id} name="nextDue" type="date" required defaultValue={item?.nextDue ?? today} />}</Field>
        </div>
        <Field label="Category">
          {(id) => (
            <Select id={id} name="category" defaultValue={item?.categoryId ?? ""}>
              <option value="">No category</option>
              {categories
                .filter((c) => c.kind === type)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </Select>
          )}
        </Field>
        <Field label="Account">
          {(id) => (
            <Select id={id} name="account" defaultValue={item?.accountId ?? ""}>
              <option value="">No account</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        {error && <FormError>{error}</FormError>}
      </form>
    </Sheet>
  );
}
