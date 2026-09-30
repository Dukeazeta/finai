"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { EditableTx } from "@/lib/tx-types";

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
}: Pick<Ctx, "user" | "baseCurrency" | "timezone" | "accounts" | "categories" | "pulseAdmin"> & { children: ReactNode }) {
  const [txForm, setTxForm] = useState<Ctx["txForm"]>({ open: false, tx: null });
  const [askOpen, setAskOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);

  const openTxForm = useCallback(
    (tx?: EditableTx | null, defaults?: Partial<EditableTx>) => setTxForm({ open: true, tx: tx ?? null, defaults }),
    [],
  );
  const closeTxForm = useCallback(() => setTxForm((s) => ({ ...s, open: false })), []);

  const value = useMemo(
    () => ({ user, baseCurrency, timezone, accounts, categories, pulseAdmin, txForm, openTxForm, closeTxForm, askOpen, setAskOpen, voiceOpen, setVoiceOpen }),
    [user, baseCurrency, timezone, accounts, categories, pulseAdmin, txForm, openTxForm, closeTxForm, askOpen, voiceOpen],
  );
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
