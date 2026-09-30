"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input, Select } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/cn";
import { CURRENCIES, currencyInfo } from "@/lib/currencies";
import { toMajor } from "@/lib/money";
import { deleteTransactions, saveTransaction } from "@/server/actions";
import { useApp } from "./app-context";

type TxType = "expense" | "income" | "transfer";

function todayIn(tz: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
}

export function TransactionFormSheet() {
  const { txForm, closeTxForm, accounts, categories, baseCurrency, timezone } = useApp();
  const router = useRouter();
  const editing = txForm.tx;

  const [type, setType] = useState<TxType>("expense");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(baseCurrency);
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [date, setDate] = useState(todayIn(timezone));
  const [payee, setPayee] = useState("");
  const [note, setNote] = useState("");
  const [fxRate, setFxRate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [deleting, startDelete] = useTransition();

  // Reset the form each time the sheet opens.
  useEffect(() => {
    if (!txForm.open) return;
    const seed = { ...txForm.defaults, ...txForm.tx };
    const acc = seed.accountId ?? (accounts.length === 1 ? accounts[0].id : "");
    const cur = seed.currency ?? accounts.find((a) => a.id === acc)?.currency ?? baseCurrency;
    /* eslint-disable react-hooks/set-state-in-effect -- form reset when the sheet opens */
    setType((seed.type ?? "expense") as TxType);
    setAmount(seed.amountMinor != null ? String(toMajor(seed.amountMinor, cur)) : "");
    setCurrency(cur);
    setCategoryId(seed.categoryId ?? "");
    setAccountId(acc);
    setToAccountId(seed.toAccountId ?? "");
    setDate(seed.date ?? todayIn(timezone));
    setPayee(seed.payee ?? "");
    setNote(seed.note ?? "");
    setFxRate(txForm.tx && cur !== baseCurrency ? String(seed.fxRate ?? "") : "");
    setError(null);
    /* eslint-enable react-hooks/set-state-in-effect */
    // Only when the sheet opens or closes; a background refresh must not wipe a half-filled form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txForm]);

  const cats = categories.filter((c) => c.kind === (type === "income" ? "income" : "expense"));

  function submit() {
    setError(null);
    start(async () => {
      const res = await saveTransaction(editing?.id ?? null, {
        type,
        amount: amount.replaceAll(",", ""),
        currency,
        categoryId: type === "transfer" ? null : categoryId || null,
        accountId: accountId || null,
        toAccountId: type === "transfer" ? toAccountId || null : null,
        payee,
        note,
        date,
        fxRate: fxRate ? Number(fxRate) : null,
      });
      if (!res.ok) return setError(res.error);
      closeTxForm();
      router.refresh();
    });
  }

  return (
    <Sheet
      open={txForm.open}
      onClose={closeTxForm}
      title={editing ? "Edit entry" : "New entry"}
      footer={
        <div className="flex items-center gap-2.5">
          {editing && (
            <Button
              type="button"
              variant="danger"
              loading={deleting}
              onClick={() =>
                startDelete(async () => {
                  const res = await deleteTransactions([editing.id]);
                  if (!res.ok) return setError(res.error);
                  closeTxForm();
                  router.refresh();
                })
              }
            >
              Delete
            </Button>
          )}
          <div className="flex-1" />
          <Button type="button" variant="outline" onClick={closeTxForm}>
            Cancel
          </Button>
          <Button type="submit" form="tx-form" loading={pending}>
            {editing ? "Save" : "Add entry"}
          </Button>
        </div>
      }
    >
      <form
        id="tx-form"
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div role="radiogroup" aria-label="Type" className="grid grid-cols-3 gap-1 rounded-full bg-parchment p-1.5">
          {(["expense", "income", "transfer"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={type === t}
              onClick={() => {
                setType(t);
                setCategoryId("");
              }}
              className={cn("h-9 rounded-full text-[14px] capitalize transition-colors", type === t ? "bg-lime font-medium" : "hover:bg-white")}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-[1fr_112px] gap-3">
          <Field label="Amount">
            {(id) => (
              <div className="relative">
                <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-graphite">{currencyInfo(currency).symbol}</span>
                <Input
                  id={id}
                  inputMode="decimal"
                  autoFocus
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ""))}
                  placeholder="0"
                  className="tabular pl-12 text-[20px]"
                />
              </div>
            )}
          </Field>
          <Field label="Currency">
            {(id) => (
              <Select id={id} value={currency} onChange={(e) => setCurrency(e.target.value)}>
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        {currency !== baseCurrency && (
          <Field label={`${baseCurrency} per 1 ${currency}`} hint="Leave empty to use today's market rate.">
            {(id, d) => (
              <Input
                id={id}
                aria-describedby={d}
                inputMode="decimal"
                value={fxRate}
                onChange={(e) => setFxRate(e.target.value.replace(/[^\d.]/g, ""))}
                placeholder="Automatic"
                className="tabular"
              />
            )}
          </Field>
        )}

        {type !== "transfer" && (
          <Field label="Category">
            {(id) => (
              <Select id={id} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">No category</option>
                {cats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}

        <div className={cn("grid gap-3", type === "transfer" && "grid-cols-2")}>
          <Field label={type === "transfer" ? "From" : type === "income" ? "Paid into" : "Paid from"}>
            {(id) => (
              <Select
                id={id}
                value={accountId}
                onChange={(e) => {
                  setAccountId(e.target.value);
                  const acc = accounts.find((a) => a.id === e.target.value);
                  if (acc && !amount) setCurrency(acc.currency);
                }}
              >
                <option value="">{type === "transfer" ? "Choose account" : "No account"}</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          {type === "transfer" && (
            <Field label="To">
              {(id) => (
                <Select id={id} value={toAccountId} onChange={(e) => setToAccountId(e.target.value)}>
                  <option value="">Choose account</option>
                  {accounts
                    .filter((a) => a.id !== accountId)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                </Select>
              )}
            </Field>
          )}
        </div>

        <Field label="Date">{(id) => <Input id={id} type="date" value={date} onChange={(e) => setDate(e.target.value)} required />}</Field>

        <Field label={type === "income" ? "From (optional)" : "Paid to (optional)"}>
          {(id) => (
            <Input
              id={id}
              value={payee}
              onChange={(e) => setPayee(e.target.value)}
              placeholder={type === "income" ? "Employer or client" : "Shop, person or service"}
              maxLength={120}
            />
          )}
        </Field>

        <Field label="Note (optional)">{(id) => <Input id={id} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />}</Field>

        {error && <FormError>{error}</FormError>}
      </form>
    </Sheet>
  );
}
