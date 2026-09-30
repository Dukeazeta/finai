import "server-only";
import type { UIMessage } from "ai";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { conversations, messages } from "@/db/schema";
import { FinanceError } from "@/server/finance/errors";

const ID_RE = /^[A-Za-z0-9_-]{6,64}$/;

export function assertChatId(id: string) {
  if (!ID_RE.test(id)) throw new FinanceError("Invalid chat id.");
}

/** Returns the conversation if the user owns it, creates it if it does not exist, and throws if someone else owns it. */
export async function ensureConversation(userId: string, id: string, title?: string) {
  assertChatId(id);
  const existing = await db.query.conversations.findFirst({ where: eq(conversations.id, id) });
  if (existing) {
    if (existing.userId !== userId) throw new FinanceError("Chat not found.");
    return existing;
  }
  const [row] = await db
    .insert(conversations)
    .values({ id, userId, title: title?.slice(0, 80) || "New chat" })
    .onConflictDoNothing()
    .returning();
  if (!row) return ensureConversation(userId, id, title);
  return row;
}

export async function getConversation(userId: string, id: string) {
  if (!ID_RE.test(id)) return null;
  return db.query.conversations.findFirst({ where: and(eq(conversations.id, id), eq(conversations.userId, userId)) });
}

export async function listConversations(userId: string, limit = 30) {
  return db.query.conversations.findMany({
    where: eq(conversations.userId, userId),
    orderBy: desc(conversations.updatedAt),
    limit,
  });
}

export async function loadMessages(conversationId: string): Promise<UIMessage[]> {
  const rows = await db.query.messages.findMany({
    where: eq(messages.conversationId, conversationId),
    orderBy: [asc(messages.position), asc(messages.createdAt)],
  });
  return rows.map((r) => ({
    id: r.id,
    role: r.role as UIMessage["role"],
    parts: r.parts as UIMessage["parts"],
    metadata: { modality: r.modality },
  }));
}

/** Upserts the full message list for a conversation. Positions follow array order. */
export async function saveMessages(conversationId: string, list: UIMessage[], modality: "text" | "voice" = "text") {
  if (!list.length) return;
  await db
    .insert(messages)
    .values(
      list.map((m, i) => ({
        id: m.id,
        conversationId,
        role: m.role,
        parts: m.parts,
        modality: ((m.metadata as { modality?: "text" | "voice" } | undefined)?.modality ?? modality) as "text" | "voice",
        position: i,
      })),
    )
    .onConflictDoUpdate({
      target: messages.id,
      set: { parts: sql`excluded.parts`, position: sql`excluded.position` },
    });
  await db.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, conversationId));
}

/** Appends messages after the existing ones (voice transcripts). */
export async function appendMessages(conversationId: string, list: UIMessage[], modality: "text" | "voice") {
  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${messages.position}), -1)` })
    .from(messages)
    .where(eq(messages.conversationId, conversationId));
  await db
    .insert(messages)
    .values(
      list.map((m, i) => ({
        id: m.id,
        conversationId,
        role: m.role,
        parts: m.parts,
        modality,
        position: Number(max) + 1 + i,
      })),
    )
    .onConflictDoNothing();
  await db.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, conversationId));
}

export async function renameConversation(userId: string, id: string, title: string) {
  await db
    .update(conversations)
    .set({ title: title.slice(0, 80) })
    .where(and(eq(conversations.id, id), eq(conversations.userId, userId)));
}

export async function deleteConversation(userId: string, id: string) {
  await db.delete(conversations).where(and(eq(conversations.id, id), eq(conversations.userId, userId)));
}
