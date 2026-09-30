"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input, Select } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { CURRENCIES } from "@/lib/currencies";
import { completeOnboarding } from "@/server/actions";

const ACCOUNT_TYPES = [
  { value: "bank", label: "Bank account", example: "GTBank" },
  { value: "mobile_money", label: "Mobile money", example: "Opay" },
  { value: "cash", label: "Cash", example: "Wallet" },
  { value: "card", label: "Card", example: "Visa card" },
] as const;

export function OnboardingForm() {
  const [baseCurrency, setBaseCurrency] = useState("NGN");
  const [type, setType] = useState<(typeof ACCOUNT_TYPES)[number]["value"]>("bank");
  const [name, setName] = useState("");
  const [balance, setBalance] = useState("");
  const [timezone, setTimezone] = useState("Africa/Lagos");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- read once from the browser after mount
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Lagos");
    } catch {}
  }, []);

  const example = ACCOUNT_TYPES.find((t) => t.value === type)!.example;
  const symbol = CURRENCIES.find((c) => c.code === baseCurrency)?.symbol ?? "";

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const res = await completeOnboarding({
            baseCurrency,
            timezone,
            accountName: name || example,
            accountType: type,
            openingBalance: balance.replaceAll(",", "") || 0,
          });
          if (res && !res.ok) setError(res.error);
        });
      }}
    >
      <Field label="Main currency" hint="Totals and budgets are shown in this currency.">
        {(id, d) => (
          <Select id={id} aria-describedby={d} value={baseCurrency} onChange={(e) => setBaseCurrency(e.target.value)}>
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} · {c.name}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-[14px] font-medium">Where is most of your money?</legend>
        <div className="grid grid-cols-2 gap-2">
          {ACCOUNT_TYPES.map((t) => (
            <label
              key={t.value}
              className={cn(
                "flex h-12 cursor-pointer items-center justify-center rounded-full border text-[15px] transition-colors has-focus-visible:outline-2 has-focus-visible:outline-ink",
                type === t.value ? "border-lime bg-lime font-medium" : "border-ash hover:border-ink",
              )}
            >
              <input type="radio" name="type" value={t.value} checked={type === t.value} onChange={() => setType(t.value)} className="sr-only" />
              {t.label}
            </label>
          ))}
        </div>
      </fieldset>

      <Field label="Account name">{(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} placeholder={example} maxLength={60} />}</Field>

      <Field label="Balance right now" hint="Rough is fine. You can correct it any time.">
        {(id, d) => (
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-graphite">{symbol}</span>
            <Input
              id={id}
              aria-describedby={d}
              inputMode="decimal"
              value={balance}
              onChange={(e) => setBalance(e.target.value.replace(/[^\d.,]/g, ""))}
              placeholder="0"
              className="tabular pl-12"
            />
          </div>
        )}
      </Field>

      {error && <FormError>{error}</FormError>}
      <Button type="submit" size="lg" loading={pending} chevron>
        Open my dashboard
      </Button>
    </form>
  );
}
