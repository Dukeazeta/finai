import type { conversations } from "@/db/schema";

export function toConvList(rows: (typeof conversations.$inferSelect)[]) {
  return rows.map((c) => ({ id: c.id, title: c.title, updatedAt: c.updatedAt.toISOString(), voice: c.id.startsWith("voice_") }));
}
