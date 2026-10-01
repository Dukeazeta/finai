"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { HideGroup } from "@/lib/hide-groups";
import type { EditableTx } from "@/lib/tx-types";
import { setHiddenAmounts } from "@/server/actions";

export type { EditableTx };
export type AppAccount = { id: string; name: string; type: string; currency: string };
export type AppCategory = { id: string; name: string; kind: "income" | "expense"; icon: string };

type Ctx = {
  user: { name: string; email: string; image?: string | null };
  baseCurrency: string;
  timezone: string;
  accounts: AppAccount[];
  categories: AppCategory[];
  /** Can open Pulse, the built-in monitoring area. */
  pulseAdmin: boolean;
  /** Areas whose amounts are masked right now. */
  hidden: ReadonlySet<HideGroup>;
  setHidden: (groups: HideGroup[], hidden: boolean) => void;
  txForm: { open: boolean; tx: EditableTx | null; defaults?: Partial<EditableTx> };
  openTxForm: (tx?: EditableTx | null, defaults?: Partial<EditableTx>) => void;
  closeTxForm: () => void;
  askOpen: boolean;
  setAskOpen: (v: boolean) => void;
  voiceOpen: boolean;
  setVoiceOpen: (v: boolean) => void;
};

const AppCtx = createContext<Ctx | null>(null);

export function AppProvider({
  children,
  user,
  baseCurrency,
  timezone,
  accounts,
  categories,
  pulseAdmin,
  hiddenAmounts,
}: Pick<Ctx, "user" | "baseCurrency" | "timezone" | "accounts" | "categories" | "pulseAdmin"> & {
  hiddenAmounts: string[];
  children: ReactNode;
}) {
  const [txForm, setTxForm] = useState<Ctx["txForm"]>({ open: false, tx: null });
  const [askOpen, setAskOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);

  // Starts from the account setting, so the first paint is already masked.
  const serverHidden = hiddenAmounts.join(",");
  const [hidden, setHiddenState] = useState<ReadonlySet<HideGroup>>(() => new Set(hiddenAmounts as HideGroup[]));
  // When the server sends a newer value (after a refresh), adopt it during render.
  const [syncedFrom, setSyncedFrom] = useState(serverHidden);
  if (syncedFrom !== serverHidden) {
    setSyncedFrom(serverHidden);
    setHiddenState(new Set(serverHidden ? (serverHidden.split(",") as HideGroup[]) : []));
  }

  const setHidden = useCallback((groups: HideGroup[], hide: boolean) => {
    let before: ReadonlySet<HideGroup> = new Set();
    setHiddenState((cur) => {
      before = cur;
      const next = new Set(cur);
      for (const g of groups) {
        if (hide) next.add(g);
        else next.delete(g);
      }
      return next;
    });
    // Saved to the account so other devices follow; put it back if the save fails.
    void setHiddenAmounts(groups, hide).then((res) => {
      if (res.ok) setHiddenState(new Set((res.data?.hiddenAmounts ?? []) as HideGroup[]));
      else setHiddenState(before);
    });
  }, []);

  const openTxForm = useCallback(
    (tx?: EditableTx | null, defaults?: Partial<EditableTx>) => setTxForm({ open: true, tx: tx ?? null, defaults }),
    [],
  );
  const closeTxForm = useCallback(() => setTxForm((s) => ({ ...s, open: false })), []);

  const value = useMemo(
    () => ({ user, baseCurrency, timezone, accounts, categories, pulseAdmin, hidden, setHidden, txForm, openTxForm, closeTxForm, askOpen, setAskOpen, voiceOpen, setVoiceOpen }),
    [user, baseCurrency, timezone, accounts, categories, pulseAdmin, hidden, setHidden, txForm, openTxForm, closeTxForm, askOpen, voiceOpen],
  );
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}

/**
 * True when amounts in this area should be masked. Safe anywhere: outside the app
 * (landing page mockups, auth screens) there is no provider and nothing is hidden.
 */
export function useAmountHidden(group?: HideGroup) {
  const ctx = useContext(AppCtx);
  return !!group && !!ctx?.hidden.has(group);
}
