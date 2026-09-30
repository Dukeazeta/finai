import type { Metadata } from "next";
import { randomUUID } from "node:crypto";
import { listConversations } from "@/server/ai/chat-store";
import { requireUser } from "@/server/session";
import { ChatView } from "./chat-view";
import { toConvList } from "./shared";

export const metadata: Metadata = { title: "Chat" };

export default async function NewChatPage() {
  const { user } = await requireUser();
  const conversations = await listConversations(user.id);
  const id = `chat_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
  return <ChatView id={id} initialMessages={[]} conversations={toConvList(conversations)} />;
}
