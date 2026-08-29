"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";

import { Composer } from "@/components/chat/composer";
import { MessageList } from "@/components/chat/message-list";
import {
  ApiError,
  connectSocket,
  getStoredUser,
  listBroadcastMessages,
  listDirectMessages,
  listProviders,
  listThreads,
  postBroadcastMessage,
  postDirectMessage,
  type ChatMessage,
  type OutgoingMessage,
  type PanelUser,
  type Provider,
  type Thread,
} from "@/lib/api";

type Room = { type: "broadcast" } | { type: "direct"; thread: Thread };

export default function ChatPage() {
  const [user, setUser] = useState<PanelUser | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [room, setRoom] = useState<Room>({ type: "broadcast" });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [canPost, setCanPost] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const roomRef = useRef<{ room: Room; providerId: string | null }>({ room, providerId });
  roomRef.current = { room, providerId };

  useEffect(() => {
    const stored = getStoredUser();
    setUser(stored);

    if (stored?.role === "provider") {
      setProviderId(stored.id);
      return;
    }

    listProviders()
      .then((list) => {
        setProviders(list);
        setProviderId(list[0]?.id ?? null);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load providers"));
  }, []);

  useEffect(() => {
    if (!providerId) return;

    setRoom({ type: "broadcast" });
    listThreads(user?.role === "admin" ? providerId : undefined)
      .then(setThreads)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load threads"));
  }, [providerId, user?.role]);

  const loadMessages = useCallback(async () => {
    if (!providerId) return;
    setError(null);

    try {
      if (room.type === "broadcast") {
        setMessages(await listBroadcastMessages(providerId));
        setCanPost(user?.role === "provider");
      } else {
        const result = await listDirectMessages(room.thread.id);
        setMessages(result.messages);
        setCanPost(result.canPost && user?.role === "provider");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load messages");
      setMessages([]);
    }
  }, [providerId, room, user?.role]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    const socket = connectSocket();
    if (!socket) return;

    socketRef.current = socket;

    socket.on("message:new", (message: ChatMessage) => {
      const current = roomRef.current;

      const belongsHere =
        current.room.type === "broadcast"
          ? message.scope === "broadcast" && message.provider === current.providerId
          : message.scope === "direct" && message.assignment === current.room.thread.id;

      if (!belongsHere) return;

      setMessages((existing) =>
        existing.some((item) => item.id === message.id) ? existing : [...existing, message]
      );
    });

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, []);

  /** Admins aren't members of any room, so they subscribe to whatever they open. */
  useEffect(() => {
    if (user?.role !== "admin" || !socketRef.current || !providerId) return;

    socketRef.current.emit(
      "room:subscribe",
      room.type === "broadcast"
        ? { scope: "broadcast", id: providerId }
        : { scope: "direct", id: room.thread.id }
    );
  }, [user?.role, providerId, room]);

  async function handleSend(message: OutgoingMessage) {
    if (!providerId) return;

    const sent =
      room.type === "broadcast"
        ? await postBroadcastMessage(providerId, message)
        : await postDirectMessage(room.thread.id, message);

    setMessages((existing) =>
      existing.some((item) => item.id === sent.id) ? existing : [...existing, sent]
    );
  }

  if (!user) return null;

  const roomTitle =
    room.type === "broadcast"
      ? "Broadcast — all assigned clients"
      : `${room.thread.user.name}${room.thread.status === "archived" ? " (archived)" : ""}`;

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Chat</h1>
      <p className="mt-1 text-sm text-zinc-600">
        {user.role === "admin"
          ? "Read-only view of every channel and conversation."
          : "Post tips to all your clients, or answer someone privately."}
      </p>

      {user.role === "admin" && (
        <select
          value={providerId ?? ""}
          onChange={(event) => setProviderId(event.target.value || null)}
          className="mt-4 rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-brand"
        >
          {providers.length === 0 && <option value="">No providers yet</option>}
          {providers.map((provider) => (
            <option key={provider.id} value={provider.id}>
              {provider.name} ({provider.clientCount} clients)
            </option>
          ))}
        </select>
      )}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {providerId && (
        <div className="mt-6 grid gap-6 lg:grid-cols-[260px_1fr]">
          <aside className="h-fit rounded-xl border border-zinc-200 bg-white p-2">
            <button
              onClick={() => setRoom({ type: "broadcast" })}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                room.type === "broadcast" ? "bg-brand text-white" : "hover:bg-zinc-100"
              }`}
            >
              Broadcast
            </button>

            <p className="px-3 pt-4 pb-1 text-xs uppercase tracking-wide text-zinc-400">Clients</p>

            {threads.length === 0 && (
              <p className="px-3 py-2 text-sm text-zinc-500">No clients assigned yet.</p>
            )}

            {threads.map((thread) => {
              const active = room.type === "direct" && room.thread.id === thread.id;

              return (
                <button
                  key={thread.id}
                  onClick={() => setRoom({ type: "direct", thread })}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    active ? "bg-brand text-white" : "hover:bg-zinc-100"
                  }`}
                >
                  <span className="block font-medium">{thread.user.name}</span>
                  <span className={`text-xs ${active ? "text-brand-soft" : "text-zinc-500"}`}>
                    {thread.status === "archived" ? "Archived" : `@${thread.user.username}`}
                  </span>
                </button>
              );
            })}
          </aside>

          <section className="flex min-h-[32rem] flex-col rounded-xl border border-zinc-200 bg-white">
            <header className="border-b border-zinc-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-zinc-900">{roomTitle}</h2>
              {room.type === "broadcast" && (
                <p className="text-xs text-zinc-500">Clients can read these tips but cannot reply.</p>
              )}
            </header>

            <div className="flex-1 overflow-y-auto">
              <MessageList
                messages={messages}
                currentUserId={user.id}
                emptyLabel={
                  room.type === "broadcast" ? "No tips posted yet." : "No messages in this thread yet."
                }
              />
            </div>

            {canPost ? (
              <Composer
                onSend={handleSend}
                placeholder={
                  room.type === "broadcast" ? "Share a tip with all clients…" : "Write a reply…"
                }
              />
            ) : (
              <p className="border-t border-zinc-200 px-4 py-3 text-xs text-zinc-500">
                {user.role === "admin"
                  ? "Admins can read conversations but not post in them."
                  : "This conversation is archived."}
              </p>
            )}
          </section>
        </div>
      )}
    </>
  );
}
