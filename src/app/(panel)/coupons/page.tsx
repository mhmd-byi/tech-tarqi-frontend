"use client";

import { useForm } from "@tanstack/react-form";
import { useEffect, useState } from "react";
import * as yup from "yup";

import {
  ApiError,
  createCoupon,
  listCoupons,
  listPlans,
  updateCoupon,
  type Coupon,
  type CouponType,
  type Plan,
} from "@/lib/api";
import { formatPrice, formatTerm } from "@/lib/format";

const couponSchema = yup.object({
  code: yup
    .string()
    .trim()
    .matches(/^[A-Za-z0-9_-]{3,20}$/, {
      message: "3-20 characters: letters, numbers, hyphens or underscores",
      excludeEmptyString: true,
    })
    .required("Code is required"),
  type: yup.string().oneOf(["percentage", "fixed"]).defined(),
  amount: yup
    .string()
    .trim()
    .matches(/^\d+(\.\d+)?$/, { message: "Enter a number", excludeEmptyString: true })
    .required("Amount is required"),
  startsAt: yup.string().trim().defined(),
  expiresAt: yup.string().trim().defined(),
  usageLimit: yup.string().trim().defined(),
  usageLimitPerUser: yup.string().trim().defined(),
});

const inputClass =
  "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand";

function formatAmount(coupon: Coupon): string {
  return coupon.type === "percentage" ? `${coupon.amount}% off` : formatPrice(coupon.amount, "usd") + " off";
}

function applicablePlansLabel(coupon: Coupon, plans: Plan[]): string {
  if (coupon.applicablePlans.length === 0) return "All plans";
  return coupon.applicablePlans
    .map((id) => plans.find((plan) => plan.id === id)?.label)
    .filter(Boolean)
    .join(", ");
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[] | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlans, setSelectedPlans] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listCoupons(), listPlans()])
      .then(([couponList, planList]) => {
        setCoupons(couponList);
        setPlans(planList);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load coupons"));
  }, []);

  const form = useForm({
    defaultValues: {
      code: "",
      type: "percentage" as CouponType,
      amount: "",
      startsAt: "",
      expiresAt: "",
      usageLimit: "",
      usageLimitPerUser: "",
    },
    validators: { onChangeAsync: couponSchema, onSubmitAsync: couponSchema },
    onSubmit: async ({ value, formApi }) => {
      setFormError(null);
      setCreated(null);

      try {
        const coupon = await createCoupon({
          code: value.code.trim(),
          type: value.type,
          amount: Number(value.amount),
          applicablePlans: selectedPlans,
          startsAt: value.startsAt || undefined,
          expiresAt: value.expiresAt || undefined,
          usageLimit: value.usageLimit ? Number(value.usageLimit) : undefined,
          usageLimitPerUser: value.usageLimitPerUser ? Number(value.usageLimitPerUser) : undefined,
        });

        setCoupons((current) => [coupon, ...(current ?? [])]);
        setCreated(`Coupon ${coupon.code} created`);
        setSelectedPlans([]);
        formApi.reset();
      } catch (err) {
        setFormError(err instanceof ApiError ? err.message : "Could not create the coupon");
      }
    },
  });

  async function toggleActive(coupon: Coupon) {
    setBusyId(coupon.id);
    setError(null);

    try {
      const updated = await updateCoupon(coupon.id, { active: !coupon.active });
      setCoupons((current) => (current ?? []).map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update the coupon");
    } finally {
      setBusyId(null);
    }
  }

  function togglePlan(planId: string) {
    setSelectedPlans((current) =>
      current.includes(planId) ? current.filter((id) => id !== planId) : [...current, planId]
    );
  }

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Coupons</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Discount codes customers enter at checkout. Providers only see and create coupons scoped to
        their own assigned clients — admins can see everything.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          {error && <p className="p-6 text-sm text-red-600">{error}</p>}
          {!error && coupons === null && <p className="p-6 text-sm text-zinc-500">Loading…</p>}
          {coupons?.length === 0 && (
            <p className="p-6 text-sm text-zinc-500">No coupons yet. Add one on the right.</p>
          )}

          {coupons && coupons.length > 0 && (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Discount</th>
                  <th className="px-4 py-3 font-medium">Plans</th>
                  <th className="px-4 py-3 font-medium">Valid</th>
                  <th className="px-4 py-3 font-medium">Usage</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {coupons.map((coupon) => (
                  <tr key={coupon.id} className="border-b border-zinc-100 last:border-0">
                    <td className="px-4 py-3 font-mono font-medium text-zinc-900">{coupon.code}</td>
                    <td className="px-4 py-3 text-zinc-700">{formatAmount(coupon)}</td>
                    <td className="px-4 py-3 text-zinc-700">{applicablePlansLabel(coupon, plans)}</td>
                    <td className="px-4 py-3 text-zinc-500">
                      {coupon.startsAt ? new Date(coupon.startsAt).toLocaleDateString() : "Any time"}
                      {coupon.expiresAt ? ` – ${new Date(coupon.expiresAt).toLocaleDateString()}` : ""}
                    </td>
                    <td className="px-4 py-3 text-zinc-700">
                      {coupon.usedCount}
                      {coupon.usageLimit ? ` / ${coupon.usageLimit}` : ""}
                      {coupon.usageLimitPerUser ? (
                        <span className="ml-1 text-xs text-zinc-500">
                          (max {coupon.usageLimitPerUser}/customer)
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          coupon.active ? "bg-green-100 text-green-800" : "bg-zinc-100 text-zinc-700"
                        }`}
                      >
                        {coupon.active ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => toggleActive(coupon)}
                        disabled={busyId === coupon.id}
                        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-40"
                      >
                        {coupon.active ? "Disable" : "Enable"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            form.handleSubmit();
          }}
          className="h-fit rounded-xl border border-zinc-200 bg-white p-6"
        >
          <h2 className="text-sm font-semibold text-zinc-900">Create a coupon</h2>

          <form.Field name="code">
            {(field) => (
              <div className="mt-4">
                <label className="block text-sm font-medium text-zinc-700" htmlFor={field.name}>
                  Code
                </label>
                <input
                  id={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value.toUpperCase())}
                  placeholder="WELCOME20"
                  className={`${inputClass} font-mono uppercase`}
                />
                {field.state.meta.isTouched && field.state.meta.errors[0] && (
                  <p className="mt-1 text-sm text-red-600">{field.state.meta.errors[0]?.message}</p>
                )}
              </div>
            )}
          </form.Field>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <form.Field name="type">
              {(field) => (
                <div>
                  <label className="block text-sm font-medium text-zinc-700" htmlFor={field.name}>
                    Type
                  </label>
                  <select
                    id={field.name}
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value as CouponType)}
                    className={inputClass}
                  >
                    <option value="percentage">Percentage off</option>
                    <option value="fixed">Fixed amount off</option>
                  </select>
                </div>
              )}
            </form.Field>

            <form.Field name="amount">
              {(field) => (
                <div>
                  <label className="block text-sm font-medium text-zinc-700" htmlFor={field.name}>
                    Amount
                  </label>
                  <input
                    id={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    placeholder="20"
                    className={inputClass}
                  />
                  {field.state.meta.isTouched && field.state.meta.errors[0] && (
                    <p className="mt-1 text-sm text-red-600">{field.state.meta.errors[0]?.message}</p>
                  )}
                </div>
              )}
            </form.Field>
          </div>

          <div className="mt-4">
            <span className="block text-sm font-medium text-zinc-700">Applicable plans</span>
            <p className="text-xs text-zinc-500">Leave all unchecked to apply to any plan.</p>
            <div className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-zinc-200 p-2">
              {plans.map((plan) => (
                <label key={plan.id} className="flex items-center gap-2 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    checked={selectedPlans.includes(plan.id)}
                    onChange={() => togglePlan(plan.id)}
                  />
                  {plan.label} · {formatPrice(plan.priceCents, plan.currency)} ({formatTerm(plan.intervalMonths)})
                </label>
              ))}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <form.Field name="startsAt">
              {(field) => (
                <div>
                  <label className="block text-sm font-medium text-zinc-700" htmlFor={field.name}>
                    Starts (optional)
                  </label>
                  <input
                    id={field.name}
                    type="date"
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    className={inputClass}
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="expiresAt">
              {(field) => (
                <div>
                  <label className="block text-sm font-medium text-zinc-700" htmlFor={field.name}>
                    Expires (optional)
                  </label>
                  <input
                    id={field.name}
                    type="date"
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    className={inputClass}
                  />
                </div>
              )}
            </form.Field>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <form.Field name="usageLimit">
              {(field) => (
                <div>
                  <label className="block text-sm font-medium text-zinc-700" htmlFor={field.name}>
                    Total use limit
                  </label>
                  <input
                    id={field.name}
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value.replace(/[^\d]/g, ""))}
                    placeholder="Unlimited"
                    className={inputClass}
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="usageLimitPerUser">
              {(field) => (
                <div>
                  <label className="block text-sm font-medium text-zinc-700" htmlFor={field.name}>
                    Limit per customer
                  </label>
                  <input
                    id={field.name}
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value.replace(/[^\d]/g, ""))}
                    placeholder="Unlimited"
                    className={inputClass}
                  />
                </div>
              )}
            </form.Field>
          </div>

          {formError && <p className="mt-4 text-sm text-red-600">{formError}</p>}
          {created && <p className="mt-4 text-sm text-green-700">{created}</p>}

          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-6 w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
              >
                {isSubmitting ? "Creating…" : "Create coupon"}
              </button>
            )}
          </form.Subscribe>
        </form>
      </div>
    </>
  );
}
