/** Totals that can be hidden, each with its own toggle. Individual entries always stay visible. */
export const HIDE_GROUPS = [
  { key: "summary", label: "Overview totals", noun: "overview totals" },
  { key: "accounts", label: "Account balances", noun: "account balances" },
  { key: "budgets", label: "Budget totals", noun: "budget totals" },
] as const;

export type HideGroup = (typeof HIDE_GROUPS)[number]["key"];
export const HIDE_GROUP_KEYS = HIDE_GROUPS.map((g) => g.key) as [HideGroup, ...HideGroup[]];

export function hideGroup(key: HideGroup) {
  return HIDE_GROUPS.find((g) => g.key === key)!;
}
