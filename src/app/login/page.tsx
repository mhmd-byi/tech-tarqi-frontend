"use client";

import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { useState } from "react";
import * as yup from "yup";

import { ApiError, clearSession, setStoredUser, setToken, signIn } from "@/lib/api";

const loginSchema = yup.object({
  identifier: yup.string().trim().required("Enter your email or username"),
  password: yup.string().required("Enter your password"),
});

const inputClass =
  "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-blue-500";

export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: { identifier: "", password: "" },
    // yup's Standard Schema validate() is async, so it only fits the *Async slots.
    validators: { onChangeAsync: loginSchema, onSubmitAsync: loginSchema },
    onSubmit: async ({ value }) => {
      setError(null);

      try {
        const result = await signIn(value.identifier.trim(), value.password);

        if (result.user.role !== "admin" && result.user.role !== "provider") {
          clearSession();
          setError("This account does not have access to the panel.");
          return;
        }

        setToken(result.token);
        setStoredUser(result.user);
        router.replace(result.user.role === "admin" ? "/kyc" : "/chat");
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      }
    },
  });

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-6 py-16">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          form.handleSubmit();
        }}
        className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm"
      >
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Tech Tarqi Admin Panel
        </h1>
        <p className="mt-2 text-sm text-zinc-600">Sign in with your administrator account.</p>

        <form.Field name="identifier">
          {(field) => (
            <div className="mt-6">
              <label className="block text-sm font-medium text-zinc-700" htmlFor={field.name}>
                Email or username
              </label>
              <input
                id={field.name}
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                autoComplete="username"
                className={inputClass}
              />
              {field.state.meta.isTouched && field.state.meta.errors[0] && (
                <p className="mt-1 text-sm text-red-600">{field.state.meta.errors[0]?.message}</p>
              )}
            </div>
          )}
        </form.Field>

        <form.Field name="password">
          {(field) => (
            <div className="mt-4">
              <label className="block text-sm font-medium text-zinc-700" htmlFor={field.name}>
                Password
              </label>
              <input
                id={field.name}
                name={field.name}
                type="password"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                autoComplete="current-password"
                className={inputClass}
              />
              {field.state.meta.isTouched && field.state.meta.errors[0] && (
                <p className="mt-1 text-sm text-red-600">{field.state.meta.errors[0]?.message}</p>
              )}
            </div>
          )}
        </form.Field>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting] as const}>
          {([canSubmit, isSubmitting]) => (
            <button
              type="submit"
              disabled={!canSubmit || isSubmitting}
              className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? "Signing in…" : "Sign in"}
            </button>
          )}
        </form.Subscribe>
      </form>
    </div>
  );
}
