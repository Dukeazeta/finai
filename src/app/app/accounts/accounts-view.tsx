"use client";

import { Banknote, CreditCard, Landmark, PiggyBank, Plus, Smartphone, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input, Select } from "@/components/ui/field";
import { Money } from "@/components/ui/money";
import { Sheet } from "@/components/ui/sheet";
import { CURRENCIES, currencyInfo } from "@/lib/currencies";
import { formatMoney, toMajor } from "@/lib/money";
import { archiveMoneyAccount, saveMoneyAccount } from "@/server/actions";

export type AccountRow = {
  id: string;
  name: string;
  type: string;
  currency: string;
  openingBalanceMinor: number;
  balanceMinor: number;
  baseBalanceMinor: number | null;
  archived: boolean;
};

export const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  bank: "Bank account",
  card: "Card",
  cash: "Cash",
  mobile_money: "Mobile money",
  savings: "Savings",
  other: "Other",
};

const TYPE_ICON = { bank: Landmark, card: CreditCard, cash: Banknote, mobile_money: Smartphone, savings: PiggyBank, other: Wallet };

export function AccountsView({ accounts, baseCurrency }: { accounts: AccountRow[]; baseCurrency: string }) {
  const [editing, setEditing] = useState<AccountRow | null>(null);
  const [open, setOpen] = useState(false);
  const active = accounts.filter((a) => !a.archived);
  const total = active.reduce((s, a) => s + (a.baseBalanceMinor ?? 0), 0);

  return (
    <>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="flex flex-col justify-between gap-8 rounded-[28px] bg-charcoal p-6 text-white sm:p-8 lg:row-span-2">
          <p className="eyebrow text-ash">
            Across {active.length} {active.length === 1 ? "account" : "accounts"}
          </p>
          <div>
            <p className="text-[clamp(3rem,6vw,4.5rem)] leading-[0.9] font-medium tracking-[-0.03em]">{formatMoney(total, baseCurrency)}</p>
            <p className="mt-3 text-[14px] text-ash">Balances update from every entry you log.</p>
            <Button
              className="mt-8"
              chevron
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              New account
            </Button>
          </div>
        </div>

        {active.map((a) => {
          const Icon = TYPE_ICON[a.type as keyof typeof TYPE_ICON] ?? Wallet;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => {
                setEditing(a);
                setOpen(true);
              }}
              className="flex min-h-[200px] flex-col justify-between rounded-[28px] bg-parchment p-6 text-left transition-colors hover:bg-[#ededdf] sm:p-7"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex size-10 items-center justify-center rounded-full bg-white">
                  <Icon className="size-[18px]" strokeWidth={1.5} aria-hidden />
                </span>
                <div className="min-w-0">
                  <div className="truncate font-medium">{a.name}</div>
                  <div className="eyebrow text-graphite">
                    {ACCOUNT_TYPE_LABEL[a.type]} · {a.currency}
                  </div>
                </div>
              </div>
              <div>
                <Money minor={a.balanceMinor} currency={a.currency} className="text-[28px] font-medium tracking-[-0.03em]" />
                {a.currency !== baseCurrency && a.baseBalanceMinor != null && (
                  <div className="text-[13px] text-graphite">About {formatMoney(a.baseBalanceMinor, baseCurrency)}</div>
                )}
              </div>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
          className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-[28px] border border-dashed border-stone text-[15px] hover:border-ink"
        >
          <span className="inline-flex size-10 items-center justify-center rounded-full bg-lime">
            <Plus className="size-5" strokeWidth={1.75} aria-hidden />
          </span>
          Add an account
        </button>
      </div>

      {accounts.some((a) => a.archived) && (
        <details className="rounded-[28px] bg-parchment px-6 py-5 text-[15px]">
          <summary className="cursor-pointer font-medium">Archived accounts</summary>
          <ul className="mt-4 flex flex-col gap-2">
            {accounts
              .filter((a) => a.archived)
              .map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 rounded-[18px] bg-white px-4 py-3">
                  <span>{a.name}</span>
                  <RestoreButton id={a.id} />
                </li>
              ))}
          </ul>
        </details>
      )}

      <AccountSheet key={`${editing?.id ?? "new"}-${open}`} open={open} onClose={() => setOpen(false)} account={editing} baseCurrency={baseCurrency} />
    </>
  );
}

function RestoreButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      loading={pending}
      onClick={() =>
        start(async () => {
          await archiveMoneyAccount(id, false);
          router.refresh();
        })
      }
    >
      Restore
    </Button>
  );
}

function AccountSheet({ open, onClose, account, baseCurrency }: { open: boolean; onClose: () => void; account: AccountRow | null; baseCurrency: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [archiving, startArchive] = useTransition();
  const [currency, setCurrency] = useState(account?.currency ?? baseCurrency);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={account ? "Edit account" : "New account"}
      footer={
        <div className="flex items-center gap-2.5">
          {account && (
            <Button
              variant="danger"
              loading={archiving}
              onClick={() =>
                startArchive(async () => {
                  const res = await archiveMoneyAccount(account.id, true);
                  if (!res.ok) return setError(res.error);
                  onClose();
                  router.refresh();
                })
              }
            >
              Archive
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="account-form" loading={pending}>
            Save
          </Button>
        </div>
      }
    >
      <form
        id="account-form"
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          setError(null);
          start(async () => {
            const res = await saveMoneyAccount(account?.id ?? null, {
              name: String(f.get("name")),
              type: String(f.get("type")),
              currency: account?.currency ?? currency,
              openingBalance: String(f.get("opening") || "0").replaceAll(",", ""),
            });
            if (!res.ok) return setError(res.error);
            onClose();
            router.refresh();
          });
        }}
      >
        <Field label="Name">{(id) => <Input id={id} name="name" defaultValue={account?.name} placeholder="GTBank, Opay, Cash…" required maxLength={60} />}</Field>
        <Field label="Type">
          {(id) => (
            <Select id={id} name="type" defaultValue={account?.type ?? "bank"}>
              {Object.entries(ACCOUNT_TYPE_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Currency" hint={account ? "Currency can't change once an account has history." : undefined}>
          {(id, d) => (
            <Select id={id} aria-describedby={d} value={account?.currency ?? currency} disabled={!!account} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} · {c.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Starting balance" hint="What was in it before you started tracking here.">
          {(id, d) => (
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-graphite">{currencyInfo(account?.currency ?? currency).symbol}</span>
              <Input
                id={id}
                aria-describedby={d}
                name="opening"
                inputMode="decimal"
                defaultValue={account ? String(toMajor(account.openingBalanceMinor, account.currency)) : ""}
                placeholder="0"
                className="tabular pl-12"
              />
            </div>
          )}
        </Field>
        {error && <FormError>{error}</FormError>}
      </form>
    </Sheet>
  );
}
