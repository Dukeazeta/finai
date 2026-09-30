import { ensureConversation } from "@/server/ai/chat-store";
import { runTool, WRITE_TOOLS } from "@/server/ai/tools";
import { getSettings } from "@/server/finance/settings";
import { getSession } from "@/server/session";

/** Executes a Live API function call for the signed in user. Input is validated by the tool's schema. */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Sign in first." }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { name?: string; args?: unknown; conversationId?: string } | null;
  if (!body?.name) return Response.json({ error: "Bad request." }, { status: 400 });

  const userId = session.user.id;
  const [conversation, settings] = await Promise.all([
    body.conversationId ? ensureConversation(userId, body.conversationId, "Voice session").catch(() => null) : null,
    getSettings(userId),
  ]);
  const result = await runTool(
    { userId, settings, source: "voice", conversationId: conversation?.id ?? null },
    body.name,
    body.args,
  );
  return Response.json({ result, writes: WRITE_TOOLS.has(body.name) });
}
