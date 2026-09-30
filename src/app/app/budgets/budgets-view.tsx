"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BudgetMeterView } from "@/components/app/budget-meter";
import { EmptyState } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input, Select } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { currencyInfo } from "@/lib/currencies";
import { toMajor } from "@/lib/money";
import { removeBudget, saveBudget } from "@/server/actions";

type B = { id: string; categoryId: string; name: string; icon: string; limitMinor: number; spentMinor: number };

export function BudgetsView({ budgets, categories, currency, daysLeft }: { budgets: B[]; categories: { id: string; name: string }[]; currency: string; daysLeft: number }) {
  const [editing, setEditing] = useState<B | null>(null);
  const [open, setOpen] = useState(false);
  const free = categories.filter((c) => !budgets.some((b) => b.categoryId === c.id));
  const openNew = () => {
    setEditing(null);
    setOpen(true);
  };

  return (
    <>
      {budgets.length === 0 ? (
        <EmptyState
          title="No budgets yet"
          body="Pick a category you want to keep an eye on and give it a monthly limit. You'll see what's left as you spend."
          action={
            <Button chevron onClick={openNew} disabled={free.length === 0}>
              New budget
            </Button>
          }
        />
      ) : (
        <>
          <div className="flex justify-end">
            <Button chevron onClick={openNew} disabled={free.length === 0}>
              New budget
            </Button>
          </div>
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {budgets.map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(b);
                    setOpen(true);
                  }}
                  className="w-full rounded-[28px] bg-parchment p-6 text-left transition-colors hover:bg-[#ededdf] sm:p-7"
                >
                  <BudgetMeterView {...b} currency={currency} daysLeft={daysLeft} iconTone="white" />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <BudgetSheet key={`${editing?.id ?? "new"}-${open}`} open={open} onClose={() => setOpen(false)} budget={editing} options={free} currency={currency} />
    </>
  );
}

function BudgetSheet({ open, onClose, budget, options, currency }: { open: boolean; onClose: () => void; budget: B | null; options: { id: string; name: string }[]; currency: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [removing, startRemove] = useTransition();

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={budget ? `${budget.name}` : "New budget"}
      description="A monthly limit. It resets on the 1st."
      footer={
        <div className="flex items-center gap-2.5">
          {budget && (
            <Button
              variant="danger"
              loading={removing}
              onClick={() =>
                startRemove(async () => {
                  await removeBudget(budget.id);
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
          <Button type="submit" form="budget-form" loading={pending}>
            Save
          </Button>
        </div>
      }
    >
      <form
        id="budget-form"
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          setError(null);
          start(async () => {
            const res = await saveBudget(budget?.categoryId ?? String(f.get("category")), String(f.get("limit")).replaceAll(",", ""));
            if (!res.ok) return setError(res.error);
            onClose();
            router.refresh();
          });
        }}
      >
        {!budget && (
          <Field label="Category">
            {(id) => (
              <Select id={id} name="category" required>
                {options.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}
        <Field label="Monthly limit">
          {(id) => (
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-graphite">{currencyInfo(currency).symbol}</span>
              <Input id={id} name="limit" inputMode="decimal" required defaultValue={budget ? String(toMajor(budget.limitMinor, currency)) : ""} className="tabular pl-12" autoFocus />
            </div>
          )}
        </Field>
        {error && <FormError>{error}</FormError>}
      </form>
    </Sheet>
  );
}
