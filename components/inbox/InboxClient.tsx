"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

type Conversation = {
  id: string;
  listingId: string;
  listingTitle: string;
  studentName: string;
  landlordName: string;
  lastMessage: string;
  lastMessageAt: string;
};

type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
};

type InboxClientProps = {
  currentUserId: string;
  role: "student" | "landlord" | "admin";
  conversations: Conversation[];
  initialConversationId: string | null;
  initialMessages: Message[];
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default function InboxClient({
  currentUserId,
  role,
  conversations,
  initialConversationId,
  initialMessages,
}: InboxClientProps) {
  const router = useRouter();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(initialConversationId);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [messageBody, setMessageBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedConversation =
    conversations.find((conversation) => conversation.id === selectedConversationId) || null;

  async function loadMessages(conversationId: string) {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/inbox/${conversationId}/messages`, { cache: "no-store" });
      const data = (await response.json()) as { messages?: Message[]; error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Unable to load messages");
      }
      setMessages(data.messages || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load messages.");
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage() {
    if (!selectedConversationId || !messageBody.trim()) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/inbox/${selectedConversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: messageBody }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Unable to send message");
      }
      setMessageBody("");
      await loadMessages(selectedConversationId);
      router.refresh();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Unable to send message.");
      setLoading(false);
    }
  }

  return (
    <section className="mt-6 grid gap-4 lg:grid-cols-[320px_1fr]">
      <aside className="rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Conversations</h2>
        <div className="mt-4 space-y-2">
          {conversations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No conversations yet.</p>
          ) : (
            conversations.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                className={`w-full rounded-md border p-3 text-left text-sm ${
                  selectedConversationId === conversation.id ? "border-primary" : "border-border"
                }`}
                onClick={() => {
                  setSelectedConversationId(conversation.id);
                  void loadMessages(conversation.id);
                }}
              >
                <p className="font-medium">{conversation.listingTitle}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {role === "student" ? conversation.landlordName : conversation.studentName}
                </p>
                <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                  {conversation.lastMessage || "No messages yet"}
                </p>
              </button>
            ))
          )}
        </div>
      </aside>

      <div className="rounded-xl border bg-card p-4 shadow-sm">
        {selectedConversation ? (
          <>
            <header className="border-b pb-3">
              <h2 className="text-lg font-semibold">Re: {selectedConversation.listingTitle}</h2>
            </header>
            <div className="mt-4 space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`rounded-md border p-3 text-sm ${
                    message.senderId === currentUserId ? "bg-muted" : "bg-background"
                  }`}
                >
                  <p>{message.body}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{formatDate(message.createdAt)}</p>
                </div>
              ))}
              {!messages.length ? (
                <p className="text-sm text-muted-foreground">No messages in this conversation yet.</p>
              ) : null}
            </div>

            <form
              className="mt-4 space-y-3 border-t pt-4"
              onSubmit={(event) => {
                event.preventDefault();
                void sendMessage();
              }}
            >
              <label className="block text-sm font-medium">
                Message
                <textarea
                  rows={3}
                  className="mt-2 w-full rounded-md border px-3 py-2 text-sm"
                  value={messageBody}
                  onChange={(event) => setMessageBody(event.target.value)}
                />
              </label>
              <Button type="submit" disabled={loading || !messageBody.trim()}>
                Send
              </Button>
            </form>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Select a conversation to view messages.</p>
        )}
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </div>
    </section>
  );
}
