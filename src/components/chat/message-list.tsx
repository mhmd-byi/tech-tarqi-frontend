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
}: {
  messages: ChatMessage[];
  currentUserId: string;
  emptyLabel: string;
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

        return (
          <div key={message.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
            <div className="max-w-[75%]">
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

              <p
                className={`mt-1 text-xs text-zinc-400 ${isOwn ? "text-right" : "text-left"}`}
              >
                {message.sender.name} ·{" "}
                {new Date(message.createdAt).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
