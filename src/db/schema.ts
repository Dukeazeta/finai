import { relations, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/* Better Auth tables (field names match better-auth 1.7 core schema) */
/* ------------------------------------------------------------------ */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------------------------------------------ */
/* Finance                                                             */
/* ------------------------------------------------------------------ */

export const txType = pgEnum("tx_type", ["income", "expense", "transfer"]);
export const categoryKind = pgEnum("category_kind", ["income", "expense"]);
export const txSource = pgEnum("tx_source", ["manual", "chat", "voice", "recurring"]);
export const moneyAccountType = pgEnum("money_account_type", [
  "cash",
  "bank",
  "card",
  "mobile_money",
  "savings",
  "other",
]);
export const cadence = pgEnum("cadence", ["weekly", "monthly", "yearly"]);
export const modality = pgEnum("modality", ["text", "voice"]);

export const userSettings = pgTable("user_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  baseCurrency: text("base_currency").notNull().default("NGN"),
  locale: text("locale").notNull().default("en-NG"),
  timezone: text("timezone").notNull().default("Africa/Lagos"),
  onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
  /** Areas whose amounts are masked (see src/lib/hide-groups.ts). Synced across devices. */
  hiddenAmounts: text("hidden_amounts").array().notNull().default(sql`'{}'::text[]`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const moneyAccounts = pgTable(
  "money_accounts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: moneyAccountType("type").notNull().default("bank"),
    currency: text("currency").notNull(),
    openingBalanceMinor: bigint("opening_balance_minor", { mode: "number" }).notNull().default(0),
    archived: boolean("archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("money_accounts_user_idx").on(t.userId)],
);

export const categories = pgTable(
  "categories",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    kind: categoryKind("kind").notNull(),
    icon: text("icon").notNull().default("circle"),
    color: text("color").notNull().default("#0b7443"),
    isDefault: boolean("is_default").notNull().default(false),
    archived: boolean("archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("categories_user_idx").on(t.userId),
    uniqueIndex("categories_user_kind_name_uq").on(t.userId, t.kind, sql`lower(${t.name})`),
  ],
);

export const transactions = pgTable(
  "transactions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: txType("type").notNull(),
    amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
    currency: text("currency").notNull(),
    fxRate: numeric("fx_rate", { precision: 20, scale: 10, mode: "number" }).notNull().default(1),
    baseAmountMinor: bigint("base_amount_minor", { mode: "number" }).notNull(),
    categoryId: text("category_id").references(() => categories.id, { onDelete: "set null" }),
    accountId: text("account_id").references(() => moneyAccounts.id, { onDelete: "set null" }),
    toAccountId: text("to_account_id").references(() => moneyAccounts.id, { onDelete: "set null" }),
    payee: text("payee"),
    note: text("note"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    source: txSource("source").notNull().default("manual"),
    conversationId: text("conversation_id"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("transactions_user_date_idx").on(t.userId, t.occurredAt),
    index("transactions_user_category_idx").on(t.userId, t.categoryId),
    index("transactions_user_account_idx").on(t.userId, t.accountId),
  ],
);

export const budgets = pgTable(
  "budgets",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    limitMinor: bigint("limit_minor", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("budgets_user_category_uq").on(t.userId, t.categoryId)],
);

export const recurring = pgTable(
  "recurring",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: categoryKind("type").notNull().default("expense"),
    amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
    currency: text("currency").notNull(),
    categoryId: text("category_id").references(() => categories.id, { onDelete: "set null" }),
    accountId: text("account_id").references(() => moneyAccounts.id, { onDelete: "set null" }),
    cadence: cadence("cadence").notNull().default("monthly"),
    nextDue: date("next_due", { mode: "string" }).notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("recurring_user_idx").on(t.userId)],
);

export const fxRates = pgTable(
  "fx_rates",
  {
    base: text("base").notNull(),
    quote: text("quote").notNull(),
    day: date("day", { mode: "string" }).notNull(),
    rate: numeric("rate", { precision: 24, scale: 12, mode: "number" }).notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.base, t.quote, t.day] })],
);

export const conversations = pgTable(
  "conversations",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("New chat"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("conversations_user_idx").on(t.userId, t.updatedAt)],
);

export const messages = pgTable(
  "messages",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    parts: jsonb("parts").notNull(),
    modality: modality("modality").notNull().default("text"),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("messages_conversation_idx").on(t.conversationId, t.position)],
);

/* ------------------------------------------------------------------ */
/* Pulse: first-party analytics, error tracking and speed monitoring   */
/* ------------------------------------------------------------------ */

/** One row per page view, click, speed sample, sign in or product event. Kept for 90 days. */
export const pulseEvents = pgTable(
  "pulse_events",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    ts: timestamp("ts", { withTimezone: true }).notNull().defaultNow(),
    /** pageview | click | vital | event | auth */
    kind: text("kind").notNull(),
    /** Path for page views, element label for clicks, metric for vitals, event name otherwise. */
    name: text("name").notNull(),
    visitorId: text("visitor_id"),
    sessionId: text("session_id"),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    path: text("path"),
    value: doublePrecision("value"),
    props: jsonb("props").$type<Record<string, unknown>>(),
    referrer: text("referrer"),
    country: text("country"),
    device: text("device"),
    browser: text("browser"),
    os: text("os"),
  },
  (t) => [
    index("pulse_events_ts_idx").on(t.ts),
    index("pulse_events_kind_idx").on(t.kind, t.ts),
    index("pulse_events_user_idx").on(t.userId, t.ts),
    index("pulse_events_session_idx").on(t.sessionId),
  ],
);

/** Errors grouped by fingerprint, the way Sentry groups events into issues. */
export const pulseIssues = pgTable(
  "pulse_issues",
  {
    id: text("id").primaryKey(),
    /** client | server */
    source: text("source").notNull(),
    name: text("name").notNull(),
    message: text("message").notNull(),
    culprit: text("culprit"),
    /** open | resolved | ignored */
    status: text("status").notNull().default("open"),
    count: integer("count").notNull().default(0),
    firstSeen: timestamp("first_seen", { withTimezone: true }).notNull().defaultNow(),
    lastSeen: timestamp("last_seen", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("pulse_issues_last_seen_idx").on(t.status, t.lastSeen)],
);

/** Each time an issue happened, with its stack and context. Kept for 90 days. */
export const pulseErrors = pgTable(
  "pulse_errors",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    issueId: text("issue_id")
      .notNull()
      .references(() => pulseIssues.id, { onDelete: "cascade" }),
    ts: timestamp("ts", { withTimezone: true }).notNull().defaultNow(),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    visitorId: text("visitor_id"),
    sessionId: text("session_id"),
    path: text("path"),
    stack: text("stack"),
    props: jsonb("props").$type<Record<string, unknown>>(),
    browser: text("browser"),
    os: text("os"),
  },
  (t) => [index("pulse_errors_issue_idx").on(t.issueId, t.ts), index("pulse_errors_ts_idx").on(t.ts)],
);

/* Relations used by the query builder */

export const transactionsRelations = relations(transactions, ({ one }) => ({
  category: one(categories, { fields: [transactions.categoryId], references: [categories.id] }),
  account: one(moneyAccounts, {
    fields: [transactions.accountId],
    references: [moneyAccounts.id],
    relationName: "from",
  }),
  toAccount: one(moneyAccounts, {
    fields: [transactions.toAccountId],
    references: [moneyAccounts.id],
    relationName: "to",
  }),
}));

export const budgetsRelations = relations(budgets, ({ one }) => ({
  category: one(categories, { fields: [budgets.categoryId], references: [categories.id] }),
}));

export const recurringRelations = relations(recurring, ({ one }) => ({
  category: one(categories, { fields: [recurring.categoryId], references: [categories.id] }),
  account: one(moneyAccounts, { fields: [recurring.accountId], references: [moneyAccounts.id] }),
}));

export type Transaction = typeof transactions.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type MoneyAccount = typeof moneyAccounts.$inferSelect;
export type Budget = typeof budgets.$inferSelect;
export type Recurring = typeof recurring.$inferSelect;
export type UserSettings = typeof userSettings.$inferSelect;
export type PulseEvent = typeof pulseEvents.$inferSelect;
export type PulseIssue = typeof pulseIssues.$inferSelect;
