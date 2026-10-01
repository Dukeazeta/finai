"use client";

import { useApp } from "@/components/app/app-context";
import { Panel } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { HIDE_GROUPS, HIDE_GROUP_KEYS } from "@/lib/hide-groups";

/** One switch per area, the same state as the eye buttons around the app. Saved to the account. */
export function PrivacyPanel() {
  const { hidden, setHidden } = useApp();
  const allHidden = HIDE_GROUP_KEYS.every((k) => hidden.has(k));
  const noneHidden = HIDE_GROUP_KEYS.every((k) => !hidden.has(k));

  return (
    <Panel eyebrow="Privacy" title="Hide amounts">
      <p className="-mt-3 mb-5 text-[15px] text-graphite">
        Hidden totals show as ₦•••• on every device you sign in on. Individual entries stay visible. You can also tap the eye next to each total.
      </p>
      <ul className="flex flex-col divide-y divide-ash">
        {HIDE_GROUPS.map((g) => {
          const on = hidden.has(g.key);
          return (
            <li key={g.key} className="flex items-center justify-between gap-4 py-3">
              <span id={`hide-${g.key}`} className="text-[15px]">
                {g.label}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-labelledby={`hide-${g.key}`}
                onClick={() => setHidden([g.key], !on)}
                className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200", on ? "bg-ink" : "bg-ash")}
              >
                <span
                  aria-hidden
                  className={cn("absolute top-1 left-1 size-5 rounded-full bg-white transition-transform duration-200", on && "translate-x-5 bg-lime")}
                />
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" disabled={allHidden} onClick={() => setHidden([...HIDE_GROUP_KEYS], true)}>
          Hide everything
        </Button>
        <Button variant="ghost" size="sm" disabled={noneHidden} onClick={() => setHidden([...HIDE_GROUP_KEYS], false)}>
          Show everything
        </Button>
      </div>
    </Panel>
  );
}
