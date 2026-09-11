"use client";

import { useEffect, useState } from "react";

import { ApiError, listSubscriptions, type SubscriptionRow } from "@/lib/api";
import { formatPrice, formatTerm } from "@/lib/format";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  past_due: "bg-amber-100 text-amber-800",
  unpaid: "bg-amber-100 text-amber-800",
  incomplete: "bg-zinc-100 text-zinc-700",
  canceled: "bg-red-100 text-red-800",
};

export default function SubscriptionsPage() {
  const [rows, setRows] = useState<SubscriptionRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listSubscriptions()
      .then(setRows)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Could not load subscriptions")
      );
  }, []);

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Subscriptions</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Billing is handled by PayPal — these rows are updated by PayPal webhooks, not edited here.
      </p>

      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}
      {!error && rows === null && <p className="mt-6 text-sm text-zinc-500">Loading…</p>}
      {rows?.length === 0 && <p className="mt-6 text-sm text-zinc-500">Nobody has subscribed yet.</p>}

      {rows && rows.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Renews / ends</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-zinc-100 last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium text-zinc-900">{row.user?.name ?? "—"}</div>
                    <div className="text-xs text-zinc-500">{row.user?.email}</div>
                  </td>
                  <td className="px-4 py-3 text-zinc-700">
                    {row.plan?.label ?? "—"}
                    {row.isTrial && (
                      <span className="ml-2 rounded bg-brand-soft px-1.5 py-0.5 text-xs font-medium text-brand">
                        Trial
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-700">
                    {row.isTrial
                      ? "Free · 3 days"
                      : row.plan
                        ? `${formatPrice(row.plan.priceCents, row.plan.currency)} · ${formatTerm(
                            row.plan.intervalMonths
                          )}`
                        : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                        STATUS_STYLES[row.status] ?? "bg-zinc-100 text-zinc-700"
                      }`}
                    >
                      {row.status.replace("_", " ")}
                    </span>
                    {row.cancelAtPeriodEnd && (
                      <span className="ml-2 text-xs text-zinc-500">cancels at period end</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">
                    {row.currentPeriodEnd
                      ? new Date(row.currentPeriodEnd).toLocaleDateString()
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
