// Dev only: creates a local test account through the app's own sign-up endpoint, completes onboarding,
// and adds a spread of sample entries so the dashboard has something to show.
// Usage: pnpm dev (in another terminal), then: node scripts/seed-dev.mjs
// Never run against production data.
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import postgres from "postgres";

export const DEV_USER = { name: "Dev Tester", email: "dev.tester@finai.test", password: "finai-dev-pass-2026" };
const BASE = process.env.APP_URL || "http://localhost:3000";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]),
);
if (!/localhost|127\.0\.0\.1/.test(BASE)) throw new Error("seed-dev only runs against a local app");

const sql = postgres(env.DATABASE_URL, { prepare: false, max: 1 });
const id = (p) => `${p}_${randomUUID().replaceAll("-", "").slice(0, 20)}`;

async function signUpOrIn() {
  const headers = { "Content-Type": "application/json", Origin: BASE };
  let res = await fetch(`${BASE}/api/auth/sign-up/email`, { method: "POST", headers, body: JSON.stringify(DEV_USER) });
  if (!res.ok) res = await fetch(`${BASE}/api/auth/sign-in/email`, { method: "POST", headers, body: JSON.stringify({ email: DEV_USER.email, password: DEV_USER.password }) });
  if (!res.ok) throw new Error(`auth failed: ${res.status} ${await res.text()}`);
  const cookie = res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  const [u] = await sql`select id from "user" where email = ${DEV_USER.email}`;
  return { userId: u.id, cookie };
}

const { userId, cookie } = await signUpOrIn();
await sql`insert into user_settings (user_id) values (${userId}) on conflict do nothing`;
await sql`update user_settings set base_currency = 'NGN', timezone = 'Africa/Lagos', onboarded_at = now() where user_id = ${userId}`;

const accounts = await sql`select id, name from money_accounts where user_id = ${userId}`;
let gtb = accounts.find((a) => a.name === "GTBank")?.id;
let opay = accounts.find((a) => a.name === "Opay")?.id;
if (!gtb) {
  gtb = id("acc");
  await sql`insert into money_accounts (id, user_id, name, type, currency, opening_balance_minor) values (${gtb}, ${userId}, 'GTBank', 'bank', 'NGN', 12000000)`;
}
if (!opay) {
  opay = id("acc");
  await sql`insert into money_accounts (id, user_id, name, type, currency, opening_balance_minor) values (${opay}, ${userId}, 'Opay', 'mobile_money', 'NGN', 1500000)`;
}

const cats = Object.fromEntries((await sql`select id, name from categories where user_id = ${userId}`).map((c) => [c.name, c.id]));
const existing = await sql`select count(*)::int n from transactions where user_id = ${userId} and source = 'manual'`;
if (existing[0].n === 0) {
  const now = new Date();
  const day = (d, h = 12) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), d, h - 1));
  const rows = [
    ["income", 35000000, "Salary", gtb, "Acme Ltd", 1],
    ["expense", 450000, "Food and drinks", opay, "Suya spot", 2],
    ["expense", 320000, "Transport", opay, "Bolt", 3],
    ["expense", 1200000, "Data and airtime", gtb, "MTN", 4],
    ["expense", 2345000, "Groceries", gtb, "Shoprite", 6],
    ["expense", 700000, "Subscriptions", gtb, "Netflix", 8],
    ["expense", 850000, "Food and drinks", opay, "Chicken Republic", 10],
    ["income", 15000000, "Freelance", gtb, "Logo project", 12],
    ["expense", 6000000, "Rent and housing", gtb, "Landlord", 14],
    ["expense", 280000, "Transport", opay, "Keke", 16],
  ].filter((r) => r[5] <= now.getUTCDate());
  for (const [type, amount, cat, acc, payee, d] of rows) {
    await sql`insert into transactions (id, user_id, type, amount_minor, currency, fx_rate, base_amount_minor, category_id, account_id, payee, occurred_at, source)
      values (${id("tx")}, ${userId}, ${type}, ${amount}, 'NGN', 1, ${amount}, ${cats[cat]}, ${acc}, ${payee}, ${day(d)}, 'manual')`;
  }
  await sql`insert into budgets (id, user_id, category_id, limit_minor) values (${id("bud")}, ${userId}, ${cats["Food and drinks"]}, 2000000) on conflict do nothing`;
  await sql`insert into budgets (id, user_id, category_id, limit_minor) values (${id("bud")}, ${userId}, ${cats["Transport"]}, 1000000) on conflict do nothing`;
  const next = new Date(now.getTime() + 5 * 86400000).toISOString().slice(0, 10);
  await sql`insert into recurring (id, user_id, name, type, amount_minor, currency, category_id, account_id, cadence, next_due)
    values (${id("rec")}, ${userId}, 'DSTV', 'expense', 1100000, 'NGN', ${cats["Subscriptions"]}, ${gtb}, 'monthly', ${next})`;
}

console.log(JSON.stringify({ userId, cookie }));
await sql.end();
