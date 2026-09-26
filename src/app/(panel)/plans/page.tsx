"use client";

import { useEffect, useState } from "react";

import { ApiError, listPlans, updatePlan, type Plan, type PlanService } from "@/lib/api";
import { formatTerm } from "@/lib/format";

const SERVICES: { key: PlanService; label: string }[] = [
  { key: "forex", label: "Forex" },
  { key: "comex", label: "COMEX" },
  { key: "index", label: "Index" },
];

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listPlans()
      .then((list) => {
        setPlans(list);
        setDrafts(
          Object.fromEntries(list.map((plan) => [plan.id, String(plan.priceCents / 100)]))
        );
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load plans"));
  }, []);

  async function save(plan: Plan, changes: { priceCents?: number; active?: boolean }) {
    setBusyId(plan.id);
    setError(null);

    try {
      const updated = await updatePlan(plan.id, changes);
      setPlans((current) =>
        (current ?? []).map((item) => (item.id === updated.id ? updated : item))
      );
      setDrafts((current) => ({ ...current, [updated.id]: String(updated.priceCents / 100) }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update the plan");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Plans</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Prices customers see in the app. Every plan is a one-off payment for its term — changing
        the price takes effect on the next purchase, with no PayPal-side plan to manage.
      </p>

      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}
      {!error && plans === null && <p className="mt-6 text-sm text-zinc-500">Loading…</p>}

      {SERVICES.map((service) => {
        const rows = (plans ?? [])
          .filter((plan) => plan.service === service.key)
          .sort((a, b) => a.intervalMonths - b.intervalMonths);

        if (rows.length === 0) return null;

        return (
          <section key={service.key} className="mt-6">
            <h2 className="text-sm font-semibold text-zinc-900">{service.label}</h2>

            <div className="mt-2 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Tier</th>
                    <th className="px-4 py-3 font-medium">Term</th>
                    <th className="px-4 py-3 font-medium">Price (USD)</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((plan) => {
                    const draft = drafts[plan.id] ?? "";
                    const changed = Number(draft) * 100 !== plan.priceCents;

                    return (
                      <tr key={plan.id} className="border-b border-zinc-100 last:border-0">
                        <td className="px-4 py-3">
                          <span className="font-medium capitalize text-zinc-900">{plan.tier}</span>
                          {plan.popular && (
                            <span className="ml-2 rounded bg-brand-soft px-1.5 py-0.5 text-xs font-medium text-brand">
                              Popular
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-zinc-700">
                          {formatTerm(plan.intervalMonths)}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            value={draft}
                            inputMode="decimal"
                            onChange={(event) =>
                              setDrafts((current) => ({
                                ...current,
                                [plan.id]: event.target.value,
                              }))
                            }
                            className="w-28 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm outline-none focus:border-brand"
                          />
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button
                            onClick={() =>
                              save(plan, { priceCents: Math.round(Number(draft) * 100) })
                            }
                            disabled={!changed || busyId === plan.id || Number.isNaN(Number(draft))}
                            className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-40"
                          >
                            Save price
                          </button>
                          <button
                            onClick={() => save(plan, { active: !plan.active })}
                            disabled={busyId === plan.id}
                            className="ml-2 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-40"
                          >
                            {plan.active ? "Deactivate" : "Activate"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </>
  );
}
