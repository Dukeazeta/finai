import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });
config();

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // Migrations use the direct (unpooled) connection when one is provided.
  dbCredentials: { url: process.env.DIRECT_URL || process.env.DATABASE_URL! },
  strict: true,
});
