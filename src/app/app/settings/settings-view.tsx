"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Panel } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input, Select } from "@/components/ui/field";
import { authClient } from "@/lib/auth-client";
import { CURRENCIES } from "@/lib/currencies";
import { deleteMyAccount, saveSettings } from "@/server/actions";

const ZONES = ["Africa/Lagos", "Africa/Accra", "Africa/Nairobi", "Africa/Johannesburg", "Europe/London", "Europe/Berlin", "America/New_York", "America/Toronto", "America/Los_Angeles", "Asia/Dubai", "UTC"];

export function SettingsView({
  name,
  email,
  baseCurrency,
  timezone,
  providers,
  googleAvailable,
}: {
  name: string;
  email: string;
  baseCurrency: string;
  timezone: string;
  providers: string[];
  googleAvailable: boolean;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState("");
  const [delError, setDelError] = useState<string | null>(null);
  const [deleting, startDelete] = useTransition();
  const zones = ZONES.includes(timezone) ? ZONES : [timezone, ...ZONES];

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.3fr_1fr]">
      <Panel eyebrow="Profile" title="You and your money">
        <form
          className="flex flex-col gap-5 rounded-[18px] bg-white p-5 sm:p-6"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            setSaved(false);
            setError(null);
            start(async () => {
              const res = await saveSettings({ name: String(f.get("name")), baseCurrency: String(f.get("currency")), timezone: String(f.get("timezone")) });
              if (!res.ok) return setError(res.error);
              setSaved(true);
              router.refresh();
            });
          }}
        >
          <Field label="Name">{(id) => <Input id={id} name="name" defaultValue={name} required />}</Field>
          <Field label="Email">{(id) => <Input id={id} value={email} disabled readOnly />}</Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Main currency" hint="New entries convert to this. Past entries keep the rate they were logged at.">
              {(id, d) => (
                <Select id={id} aria-describedby={d} name="currency" defaultValue={baseCurrency}>
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} · {c.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Timezone">
              {(id) => (
                <Select id={id} name="timezone" defaultValue={timezone}>
                  {zones.map((z) => (
                    <option key={z} value={z}>
                      {z.replaceAll("_", " ")}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
          {error && <FormError>{error}</FormError>}
          <div className="flex items-center gap-3">
            <Button type="submit" loading={pending}>
              Save changes
            </Button>
            {saved && (
              <span role="status" className="text-[14px]">
                Saved
              </span>
            )}
          </div>
        </form>
      </Panel>

      <div className="flex flex-col gap-3">
        <Panel eyebrow="Sign in" title="How you log in">
          <ul className="flex flex-col divide-y divide-ash text-[15px]">
            <li className="flex items-center justify-between gap-3 py-3">
              <span>Email and password</span>
              <span className="eyebrow text-graphite">{providers.includes("credential") ? "On" : "Not set up"}</span>
            </li>
            <li className="flex items-center justify-between gap-3 py-3">
              <span>Google</span>
              {providers.includes("google") ? (
                <span className="eyebrow text-graphite">Connected</span>
              ) : googleAvailable ? (
                <Button size="sm" variant="outline" onClick={() => authClient.linkSocial({ provider: "google", callbackURL: "/app/settings" })}>
                  Connect
                </Button>
              ) : (
                <span className="eyebrow text-graphite">Unavailable</span>
              )}
            </li>
          </ul>
          <Button
            variant="outline"
            className="mt-5"
            onClick={async () => {
              await authClient.signOut();
              router.replace("/");
              router.refresh();
            }}
          >
            Log out
          </Button>
        </Panel>

        <Panel tone="dark" eyebrow="Danger zone" title="Delete account">
          <p className="text-[14px] text-ash">
            This removes your account and every entry, budget and chat. It can&apos;t be undone. Export your transactions first if you want a copy.
          </p>
          <form
            className="mt-5 flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              setDelError(null);
              startDelete(async () => {
                const res = await deleteMyAccount(confirm);
                if (res && !res.ok) setDelError(res.error);
              });
            }}
          >
            <label htmlFor="confirm-delete" className="text-[14px]">
              Type DELETE to confirm
            </label>
            <input
              id="confirm-delete"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="off"
              className="h-12 rounded-[8px] border border-white/25 bg-transparent px-3.5 text-[16px] text-white outline-none focus:border-white"
            />
            <Button type="submit" variant="danger" loading={deleting} disabled={confirm.trim().toUpperCase() !== "DELETE"} className="self-start border-[#ff8a75] text-[#ff8a75]">
              Delete everything
            </Button>
            {delError && (
              <p role="alert" className="text-[14px] text-[#ff8a75]">
                {delError}
              </p>
            )}
          </form>
        </Panel>
      </div>
    </div>
  );
}
