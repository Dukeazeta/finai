import type { UIMessage } from "ai";
import { z } from "zod";
import { appendMessages, ensureConversation } from "@/server/ai/chat-store";
import { errorMessage } from "@/server/finance/errors";
import { getSession } from "@/server/session";

const body = z.object({
  conversationId: z.string(),
  turns: z
    .array(
      z.object({
        id: z.string().regex(/^[A-Za-z0-9_-]{6,64}$/),
        role: z.enum(["user", "assistant"]),
        text: z.string().max(8000),
      }),
    )
    .max(50),
});

/** Saves spoken turns (from Live API transcriptions) into the conversation history. */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Sign in first." }, { status: 401 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Bad request." }, { status: 400 });

  let conversation;
  try {
    conversation = await ensureConversation(session.user.id, parsed.data.conversationId, "Voice session");
  } catch (e) {
    return Response.json({ error: errorMessage(e) }, { status: 400 });
  }

  const msgs: UIMessage[] = parsed.data.turns
    .filter((t) => t.text.trim())
    .map((t) => ({ id: t.id, role: t.role, parts: [{ type: "text", text: t.text.trim() }] }));
  if (msgs.length) await appendMessages(conversation.id, msgs, "voice");
  return Response.json({ ok: true });
}
