"use client";

import { useState } from "react";

import { ApiError, sendTestEmail } from "@/lib/api";

export default function SettingsPage() {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function handleSendTestEmail() {
    setSending(true);
    setResult(null);

    try {
      const { message } = await sendTestEmail();
      setResult({ ok: true, message });
    } catch (err) {
      setResult({
        ok: false,
        message: err instanceof ApiError ? err.message : "Could not send the test email",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Settings</h1>
      <p className="mt-1 text-sm text-zinc-600">Server-side configuration checks.</p>

      <section className="mt-6 max-w-md rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-zinc-900">Email (Brevo)</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Sends a test email to your own account address to confirm Brevo is configured correctly.
        </p>

        <button
          onClick={handleSendTestEmail}
          disabled={sending}
          className="mt-4 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-40"
        >
          {sending ? "Sending…" : "Send test email"}
        </button>

        {result && (
          <p className={`mt-3 text-sm ${result.ok ? "text-green-700" : "text-red-600"}`}>
            {result.message}
          </p>
        )}
      </section>
    </>
  );
}
