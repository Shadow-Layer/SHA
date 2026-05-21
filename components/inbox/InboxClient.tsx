"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
  readAt: string | null;
};

type InboxClientProps = {
  currentUserId: string;
  role: "student" | "landlord" | "service_provider" | "admin";
  conversations: Conversation[];
  initialConversationId: string | null;
  initialMessages: Message[];
};

type RealtimeLike = {
  connection: {
    on: (event: string, listener: (...args: unknown[]) => void) => void;
    off: (event: string, listener: (...args: unknown[]) => void) => void;
    close: () => void;
  };
  channels: {
    get: (name: string) => ChannelLike;
    release?: (name: string) => void;
  };
};

type ChannelLike = {
  attach: () => Promise<void>;
  detach?: () => Promise<void>;
  publish: (name: string, data?: unknown) => Promise<void>;
  subscribe: (name: string, listener: (message: { data?: unknown }) => void) => Promise<void>;
  unsubscribe: (name?: string, listener?: (message: { data?: unknown }) => void) => void;
  presence: {
    enter: (data?: unknown) => Promise<void>;
    leave: () => Promise<void>;
    get: () => Promise<Array<{ clientId?: string; data?: unknown }>>;
    subscribe: (
      event: string,
      listener: (member: { clientId?: string; data?: unknown }) => void,
    ) => Promise<void>;
    unsubscribe: (
      event?: string,
      listener?: (member: { clientId?: string; data?: unknown }) => void,
    ) => void;
  };
};

type AblyMessagePayload = Partial<Message> & {
  senderId?: string;
  body?: string;
  createdAt?: string;
  userId?: string;
  isTyping?: boolean;
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

function sortMessages(messages: Message[]) {
  return [...messages].sort((left, right) => {
    if (left.createdAt === right.createdAt) {
      return left.id.localeCompare(right.id);
    }

    return left.createdAt < right.createdAt ? -1 : 1;
  });
}

function mergeMessages(existing: Message[], incoming: Message[]) {
  const byId = new Map(existing.map((message) => [message.id, message]));
  incoming.forEach((message) => {
    const previous = byId.get(message.id);
    byId.set(message.id, previous ? { ...previous, ...message } : message);
  });
  return sortMessages(Array.from(byId.values()));
}

function normalizeMessage(
  payload: Partial<Message> & { senderId?: string; body?: string; createdAt?: string },
  conversationId: string,
) {
  if (
    typeof payload.id !== "string" ||
    typeof payload.senderId !== "string" ||
    typeof payload.body !== "string" ||
    typeof payload.createdAt !== "string"
  ) {
    return null;
  }

  return {
    id: payload.id,
    conversationId,
    senderId: payload.senderId,
    body: payload.body,
    createdAt: payload.createdAt,
    readAt: typeof payload.readAt === "string" ? payload.readAt : null,
  } satisfies Message;
}

export default function InboxClient({
  currentUserId,
  role,
  conversations,
  initialConversationId,
  initialMessages,
}: InboxClientProps) {
  const realtimeRef = useRef<RealtimeLike | null>(null);
  const channelRef = useRef<ChannelLike | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [conversationList, setConversationList] = useState(conversations);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(initialConversationId);
  const [messages, setMessages] = useState<Message[]>(sortMessages(initialMessages));
  const [messageBody, setMessageBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [ablyReady, setAblyReady] = useState(false);
  const [ablyFailed, setAblyFailed] = useState(false);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [isOtherUserOnline, setIsOtherUserOnline] = useState(false);

  const selectedConversation =
    conversationList.find((conversation) => conversation.id === selectedConversationId) || null;

  const updateConversationPreview = useCallback((conversationId: string, body: string, createdAt: string) => {
    setConversationList((current) => {
      const next = current.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              lastMessage: body,
              lastMessageAt: createdAt,
            }
          : conversation,
      );

      next.sort((left, right) => (left.lastMessageAt < right.lastMessageAt ? 1 : -1));
      return next;
    });
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/inbox/${conversationId}/messages`, { cache: "no-store" });
      const data = (await response.json()) as { messages?: Message[]; error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Unable to load messages");
      }

      setMessages(sortMessages(data.messages || []));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load messages.");
    } finally {
      setLoading(false);
    }
  }, []);

  const markConversationRead = useCallback(async (conversationId: string) => {
    try {
      const response = await fetch(`/api/inbox/${conversationId}/messages/read`, {
        method: "PATCH",
      });
      const data = (await response.json()) as { updated?: number; error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Unable to update read receipts");
      }

      if ((data.updated || 0) > 0) {
        const readAt = new Date().toISOString();
        setMessages((current) =>
          current.map((message) =>
            message.conversationId === conversationId &&
            message.senderId !== currentUserId &&
            !message.readAt
              ? { ...message, readAt }
              : message,
          ),
        );
      }
    } catch {
      // Read receipts should not block chat usage.
    }
  }, [currentUserId]);

  const publishTyping = useCallback(async (isTyping: boolean) => {
    if (!ablyReady || !channelRef.current || !selectedConversationId) {
      return;
    }

    try {
      await channelRef.current.publish("typing", {
        conversationId: selectedConversationId,
        userId: currentUserId,
        isTyping,
      });
    } catch {
      // Ignore transient realtime publish failures and keep the form usable.
    }
  }, [ablyReady, currentUserId, selectedConversationId]);

  async function sendMessage() {
    if (!selectedConversationId || !messageBody.trim()) {
      return;
    }

    setSending(true);
    setError(null);
    try {
      const response = await fetch(`/api/inbox/${selectedConversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: messageBody }),
      });
      const data = (await response.json()) as Message & { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Unable to send message");
      }

      const createdMessage = normalizeMessage(data, selectedConversationId);
      if (createdMessage) {
        setMessages((current) => mergeMessages(current, [createdMessage]));
        updateConversationPreview(selectedConversationId, createdMessage.body, createdMessage.createdAt);
      }

      setMessageBody("");
      setIsOtherUserTyping(false);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }

      await publishTyping(false);

      if (!ablyReady || ablyFailed) {
        await loadMessages(selectedConversationId);
      }
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Unable to send message.");
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    let client: RealtimeLike | null = null;
    let connectedListener: (() => void) | null = null;
    let failedListener: (() => void) | null = null;

    async function setupRealtime() {
      try {
        const ablyModule = await import("ably");
        const Ably = ("default" in ablyModule ? ablyModule.default : ablyModule) as typeof import("ably");
        if (cancelled) {
          return;
        }

        client = new Ably.Realtime({
          authUrl: "/api/ably/token",
        }) as unknown as RealtimeLike;
        realtimeRef.current = client;

        connectedListener = () => {
          if (cancelled) {
            return;
          }

          setAblyReady(true);
          setAblyFailed(false);
          setError(null);
        };
        failedListener = () => {
          if (cancelled) {
            return;
          }

          setAblyReady(false);
          setAblyFailed(true);
          setError((current) => current || "Realtime chat is unavailable. Use refresh to load new messages.");
        };

        client.connection.on("connected", connectedListener);
        client.connection.on("failed", failedListener);
      } catch (setupError) {
        console.error("Failed to initialize Ably", setupError);
        if (!cancelled) {
          setAblyReady(false);
          setAblyFailed(true);
          setError("Realtime chat is unavailable. Use refresh to load new messages.");
        }
      }
    }

    void setupRealtime();

    return () => {
      cancelled = true;

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }

      if (client && connectedListener) {
        client.connection.off("connected", connectedListener);
      }
      if (client && failedListener) {
        client.connection.off("failed", failedListener);
      }
      if (client) {
        client.connection.close();
      }
      realtimeRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      setIsOtherUserTyping(false);
      setIsOtherUserOnline(false);
      return;
    }

    if (selectedConversationId !== initialConversationId) {
      void loadMessages(selectedConversationId);
    }
    void markConversationRead(selectedConversationId);
  }, [initialConversationId, loadMessages, markConversationRead, selectedConversationId]);

  useEffect(() => {
    if (!selectedConversationId || !ablyReady || !realtimeRef.current) {
      return;
    }

    let active = true;
    let joinedPresence = false;
    const channelName = `inbox:${selectedConversationId}`;
    const channel = realtimeRef.current.channels.get(channelName);
    channelRef.current = channel;
    setIsOtherUserTyping(false);
    setIsOtherUserOnline(false);

    const syncPresence = async () => {
      try {
        const members = await channel.presence.get();
        if (!active) {
          return;
        }

        setIsOtherUserOnline(members.some((member) => member.clientId && member.clientId !== currentUserId));
      } catch {
        if (active) {
          setIsOtherUserOnline(false);
        }
      }
    };

    const handleNewMessage = (ablyMessage: { data?: unknown }) => {
      if (!active) {
        return;
      }

      const nextMessage = normalizeMessage(
        (ablyMessage.data || {}) as AblyMessagePayload,
        selectedConversationId,
      );
      if (!nextMessage) {
        return;
      }

      setMessages((current) => mergeMessages(current, [nextMessage]));
      updateConversationPreview(selectedConversationId, nextMessage.body, nextMessage.createdAt);

      if (nextMessage.senderId !== currentUserId) {
        void markConversationRead(selectedConversationId);
      }
    };

    const handleTyping = (ablyMessage: { data?: unknown }) => {
      const data = (ablyMessage.data || {}) as AblyMessagePayload;
      if (data.userId === currentUserId) {
        return;
      }

      setIsOtherUserTyping(Boolean(data.isTyping));
    };

    const handleReadReceipt = (ablyMessage: { data?: unknown }) => {
      const data = (ablyMessage.data || {}) as AblyMessagePayload;
      if (data.userId === currentUserId || typeof data.readAt !== "string") {
        return;
      }

      setMessages((current) =>
        current.map((message) =>
          message.senderId === currentUserId &&
          !message.readAt &&
          message.createdAt <= data.readAt!
            ? { ...message, readAt: data.readAt || null }
            : message,
        ),
      );
    };

    const handlePresenceChange = () => {
      void syncPresence();
    };

    async function joinChannel() {
      try {
        await channel.attach();
        await Promise.all([
          channel.subscribe("message:new", handleNewMessage),
          channel.subscribe("typing", handleTyping),
          channel.subscribe("read:receipt", handleReadReceipt),
          channel.presence.subscribe("enter", handlePresenceChange),
          channel.presence.subscribe("update", handlePresenceChange),
          channel.presence.subscribe("leave", handlePresenceChange),
        ]);
        await channel.presence.enter({
          conversationId: selectedConversationId,
          userId: currentUserId,
        });
        joinedPresence = true;
        await syncPresence();
      } catch (channelError) {
        console.error("Failed to join Ably conversation channel", channelError);
        if (active) {
          setAblyReady(false);
          setAblyFailed(true);
          setError((current) => current || "Realtime chat is unavailable. Use refresh to load new messages.");
        }
      }
    }

    void joinChannel();

    return () => {
      active = false;
      setIsOtherUserTyping(false);
      setIsOtherUserOnline(false);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }

      channel.unsubscribe("message:new", handleNewMessage);
      channel.unsubscribe("typing", handleTyping);
      channel.unsubscribe("read:receipt", handleReadReceipt);
      channel.presence.unsubscribe("enter", handlePresenceChange);
      channel.presence.unsubscribe("update", handlePresenceChange);
      channel.presence.unsubscribe("leave", handlePresenceChange);

      if (joinedPresence) {
        void channel.presence.leave().catch(() => undefined);
      }
      if (channel.detach) {
        void channel.detach().catch(() => undefined);
      }
      realtimeRef.current?.channels.release?.(channelName);
      channelRef.current = null;
    };
  }, [ablyReady, currentUserId, markConversationRead, selectedConversationId, updateConversationPreview]);

  return (
    <section className="mt-6 space-y-4">
      {ablyReady ? (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900 shadow-sm">
          ✓ Realtime chat enabled
        </div>
      ) : ablyFailed ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm">
          ⚠ Realtime unavailable — use Refresh to load new messages
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-[280px_1fr]">
        <aside
          className={
            mobileView === "chat"
              ? "hidden rounded-xl border bg-card p-4 shadow-sm md:block"
              : "rounded-xl border bg-card p-4 shadow-sm md:block"
          }
        >
          <h2 className="text-lg font-semibold">Conversations</h2>
          <div className="mt-4 space-y-2">
            {conversationList.length === 0 ? (
              <p className="text-sm text-muted-foreground">No conversations yet.</p>
            ) : (
              conversationList.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  className={`w-full rounded-md border p-3 text-left text-sm ${
                    selectedConversationId === conversation.id ? "border-primary" : "border-border"
                  }`}
                  onClick={() => {
                    setSelectedConversationId(conversation.id);
                    setMobileView("chat");
                    setError(null);
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

        <div
          className={
            mobileView === "list"
              ? "hidden rounded-xl border bg-card p-4 shadow-sm md:block"
              : "rounded-xl border bg-card p-4 shadow-sm md:block"
          }
        >
          {selectedConversation ? (
            <>
              <header className="border-b pb-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="text-sm font-medium md:hidden"
                      onClick={() => setMobileView("list")}
                    >
                      ← Back
                    </button>
                    <h2 className="text-lg font-semibold">Re: {selectedConversation.listingTitle}</h2>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void loadMessages(selectedConversation.id)}
                    disabled={loading}
                  >
                    Refresh
                  </Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {isOtherUserOnline ? "Online now" : "Offline"}
                  {isOtherUserTyping ? " • Typing…" : ""}
                  {!ablyReady && ablyFailed ? " • Manual refresh mode" : ""}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Messages are delivered in real time when possible. If you don&apos;t see a new
                  message, use Refresh.
                </p>
              </header>
              <div className="mt-4 space-y-3">
                {messages.map((message) => {
                  const isCurrentUserMessage = message.senderId === currentUserId;

                  return (
                    <div
                      key={message.id}
                      className={`rounded-md border p-3 text-sm ${
                        isCurrentUserMessage ? "bg-muted" : "bg-background"
                      }`}
                    >
                      <p>{message.body}</p>
                      <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                        <span>{formatDate(message.createdAt)}</span>
                        {isCurrentUserMessage ? <span>{message.readAt ? "Read" : "Sent"}</span> : null}
                      </div>
                    </div>
                  );
                })}
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
                    onChange={(event) => {
                      const value = event.target.value;
                      setMessageBody(value);

                      if (!ablyReady || !selectedConversationId) {
                        return;
                      }

                      void publishTyping(Boolean(value.trim()));
                      if (typingTimeoutRef.current) {
                        clearTimeout(typingTimeoutRef.current);
                      }
                      typingTimeoutRef.current = setTimeout(() => {
                        void publishTyping(false);
                      }, 1200);
                    }}
                  />
                </label>
                <Button type="submit" disabled={loading || sending || !messageBody.trim()}>
                  {sending ? "Sending..." : "Send"}
                </Button>
              </form>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Select a conversation to view messages.</p>
          )}
          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        </div>
      </div>
    </section>
  );
}
