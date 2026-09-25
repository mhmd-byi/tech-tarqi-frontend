"use client";

import { useEffect, useRef, useState } from "react";

import { SignalCard } from "@/components/chat/signal-card";
import { fetchMessageImageUrl, type ChatMessage } from "@/lib/api";

function MessageImage({ messageId }: { messageId: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;

    fetchMessageImageUrl(messageId)
      .then((result) => {
        objectUrl = result;
        setUrl(result);
      })
      .catch(() => setFailed(true));

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [messageId]);

  if (failed) return <p className="text-xs text-red-600">Image could not be loaded</p>;
  if (!url) return <div className="h-40 w-full animate-pulse rounded-lg bg-zinc-200" />;

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="Attachment" className="max-h-80 rounded-lg" />;
}

export function MessageList({
  messages,
  currentUserId,
  emptyLabel,
  theirLastReadAt,
  onEdit,
  onDelete,
}: {
  messages: ChatMessage[];
  currentUserId: string;
  emptyLabel: string;
  /** Only meaningful for a direct thread — undefined hides read receipts entirely. */
  theirLastReadAt?: string;
  onEdit: (message: ChatMessage) => void;
  onDelete: (message: ChatMessage) => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  if (messages.length === 0) {
    return <p className="p-6 text-sm text-zinc-500">{emptyLabel}</p>;
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      {messages.map((message) => {
        const isOwn = message.sender.id === currentUserId;
        const seen =
          theirLastReadAt !== undefined &&
          new Date(message.createdAt).getTime() <= new Date(theirLastReadAt).getTime();

        return (
          <div key={message.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
            <div className="max-w-[75%]">
              {message.deleted ? (
                <div className="rounded-2xl border border-dashed border-zinc-300 px-3 py-2">
                  <p className="text-sm italic text-zinc-400">This message was deleted</p>
                </div>
              ) : (
                <div
                  className={`rounded-2xl px-3 py-2 ${
                    isOwn ? "bg-brand text-white" : "bg-zinc-100 text-zinc-900"
                  }`}
                >
                  {message.kind === "signal" && message.signal && (
                    <div className="text-zinc-900">
                      <SignalCard signal={message.signal} />
                    </div>
                  )}

                  {message.hasImage && (
                    <div className={message.kind === "signal" ? "mt-2" : ""}>
                      <MessageImage messageId={message.id} />
                    </div>
                  )}

                  {message.text && (
                    <p className={`whitespace-pre-wrap text-sm ${message.hasImage ? "mt-2" : ""}`}>
                      {message.text}
                    </p>
                  )}
                </div>
              )}

              <p className={`mt-1 text-xs text-zinc-400 ${isOwn ? "text-right" : "text-left"}`}>
                {message.sender.name} ·{" "}
                {new Date(message.createdAt).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {message.edited && !message.deleted && " · edited"}
                {isOwn && theirLastReadAt !== undefined && !message.deleted && (
                  <> · {seen ? "Seen" : "Sent"}</>
                )}
              </p>

              {isOwn && !message.deleted && (
                <p className="mt-0.5 text-right text-xs">
                  <button
                    onClick={() => onEdit(message)}
                    className="text-zinc-400 hover:text-brand hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(message)}
                    className="ml-2 text-zinc-400 hover:text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </p>
              )}
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
