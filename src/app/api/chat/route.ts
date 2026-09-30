import {
  convertToModelMessages,
  createIdGenerator,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  validateUIMessages,
  type UIMessage,
} from "ai";
import { buildInstructions } from "@/server/ai/prompt";
import { ensureConversation, loadMessages, renameConversation, saveMessages } from "@/server/ai/chat-store";
import { chatModel, chatTools, hasGeminiKey } from "@/server/ai/model";
import { errorMessage } from "@/server/finance/errors";
import { getSettings } from "@/server/finance/settings";
import { getSession } from "@/server/session";

export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Sign in to chat." }, { status: 401 });
  if (!hasGeminiKey()) return Response.json({ error: "The AI is not configured yet. Add GEMINI_API_KEY." }, { status: 503 });

  let body: { id?: string; message?: UIMessage };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Bad request." }, { status: 400 });
  }
  const { id, message } = body;
  if (!id || !message || message.role !== "user") return Response.json({ error: "Bad request." }, { status: 400 });

  const userId = session.user.id;
  const firstText = message.parts.find((p) => p.type === "text")?.text ?? "";

  let conversation;
  try {
    conversation = await ensureConversation(userId, id, firstText);
  } catch (e) {
    return Response.json({ error: errorMessage(e) }, { status: 404 });
  }
  if (conversation.title === "New chat" && firstText) await renameConversation(userId, id, firstText);

  const settings = await getSettings(userId);
  const ctx = { userId, settings, source: "chat" as const, conversationId: id };
  const tools = chatTools(ctx);

  const previous = await loadMessages(id);
  let history: UIMessage[];
  try {
    history = await validateUIMessages({ messages: [...previous, message], tools });
  } catch {
    // Stored history no longer matches the tool schemas; continue with just the new message.
    history = [message];
  }

  const result = streamText({
    model: chatModel(),
    instructions: await buildInstructions(userId, session.user.name, settings, "text"),
    messages: await convertToModelMessages(history.filter((m) => m.role !== "system")),
    tools,
    stopWhen: isStepCount(8),
  });

  result.consumeStream();

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      originalMessages: history,
      generateMessageId: createIdGenerator({ prefix: "msg", size: 16 }),
      onEnd: async ({ messages }) => {
        await saveMessages(id, messages);
      },
      onError: (error) => {
        console.error("chat stream error", error);
        return "The assistant ran into a problem. Please try again.";
      },
    }),
  });
}
