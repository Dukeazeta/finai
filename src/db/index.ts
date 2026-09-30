import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) console.warn("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");

// Reuse one client across hot reloads in dev.
const globalForDb = globalThis as unknown as { __finaiSql?: ReturnType<typeof postgres> };

const client =
  globalForDb.__finaiSql ??
  postgres(url ?? "postgres://localhost/finai_unset", {
    max: process.env.NODE_ENV === "production" ? 5 : 3,
    // Neon's pooled endpoint runs PgBouncer in transaction mode, which does not support prepared statements.
    prepare: false,
  });

if (process.env.NODE_ENV !== "production") globalForDb.__finaiSql = client;

export const db = drizzle(client, { schema, casing: "snake_case" });
export type DB = typeof db;
