import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getConversation, listConversations, loadMessages } from "@/server/ai/chat-store";
import { requireUser } from "@/server/session";
import { ChatView } from "../chat-view";
import { toConvList } from "../shared";

export const metadata: Metadata = { title: "Chat" };

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await requireUser();
  const [conversation, conversations] = await Promise.all([getConversation(user.id, id), listConversations(user.id)]);

  // A brand new id (opened from the ask panel before its first save) renders as an empty chat.
  if (!conversation && !/^chat_[a-z0-9]{16}$/.test(id)) notFound();
  const messages = conversation ? await loadMessages(id) : [];

  return <ChatView id={id} initialMessages={messages} conversations={toConvList(conversations)} />;
}
