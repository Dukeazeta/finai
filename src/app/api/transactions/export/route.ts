import { periodRange, type Period } from "@/lib/dates";
import { toMajor } from "@/lib/money";
import { getSettings } from "@/server/finance/settings";
import { listTransactions, type TxType } from "@/server/finance/transactions";
import { getSession } from "@/server/session";

function csv(v: unknown) {
  const s = v == null ? "" : String(v);
  // Neutralise spreadsheet formula injection and quote everything.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replaceAll('"', '""')}"`;
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return new Response("Sign in first.", { status: 401 });
  const userId = session.user.id;
  const settings = await getSettings(userId);
  const url = new URL(req.url);
  const period = (url.searchParams.get("period") ?? "all_time") as Period;
  const range = periodRange(
    ["this_month", "last_month", "last_30_days", "this_year", "all_time"].includes(period) ? period : "all_time",
    settings.timezone,
  );
  const type = url.searchParams.get("type") as TxType | null;

  const rows = await listTransactions(userId, {
    from: period === "all_time" ? undefined : range.start,
    to: period === "all_time" ? undefined : range.end,
    type: type ?? undefined,
    categoryId: url.searchParams.get("category") ?? undefined,
    accountId: url.searchParams.get("account") ?? undefined,
    search: url.searchParams.get("q") ?? undefined,
    limit: 500,
  });

  const header = ["Date", "Type", "Amount", "Currency", `Amount (${settings.baseCurrency})`, "Category", "Account", "To account", "Payee", "Note", "Logged via"];
  const dateFmt = new Intl.DateTimeFormat("en-CA", { timeZone: settings.timezone });
  const lines = rows.map((t) =>
    [
      dateFmt.format(t.occurredAt),
      t.type,
      toMajor(t.amountMinor, t.currency),
      t.currency,
      toMajor(t.baseAmountMinor, settings.baseCurrency),
      t.category?.name,
      t.account?.name,
      t.toAccount?.name,
      t.payee,
      t.note,
      t.source,
    ]
      .map(csv)
      .join(","),
  );
  const body = "﻿" + [header.map(csv).join(","), ...lines].join("\r\n");
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="finai-transactions-${dateFmt.format(new Date())}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
