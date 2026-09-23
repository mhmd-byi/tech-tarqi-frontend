"use client";

import { useForm } from "@tanstack/react-form";
import { useEffect, useState } from "react";
import * as yup from "yup";

import { ApiError, createAdmin, listAdmins, type Admin } from "@/lib/api";

const adminSchema = yup.object({
  name: yup.string().trim().min(2, "Name must be at least 2 characters").required("Name is required"),
  username: yup
    .string()
    .trim()
    .matches(/^[a-zA-Z][a-zA-Z0-9_]{2,19}$/, {
      message: "Start with a letter; 3-20 letters, numbers or underscores",
      excludeEmptyString: true,
    })
    .required("Username is required"),
  email: yup
    .string()
    .trim()
    .matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, {
      message: "Enter a valid email address",
      excludeEmptyString: true,
    })
    .required("Email is required"),
  countryCode: yup
    .string()
    .trim()
    .matches(/^\+\d{1,4}$/, { message: "Use the form +1", excludeEmptyString: true })
    .required("Country code is required"),
  mobile: yup
    .string()
    .trim()
    .matches(/^\d{7,15}$/, { message: "Enter a valid mobile number", excludeEmptyString: true })
    .required("Mobile is required"),
  password: yup
    .string()
    .matches(/^(?=.*[A-Za-z])(?=.*\d).{8,}$/, {
      message: "At least 8 characters, with a letter and a number",
      excludeEmptyString: true,
    })
    .required("Password is required"),
});

const inputClass =
  "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand";

export default function AdminsPage() {
  const [admins, setAdmins] = useState<Admin[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);

  useEffect(() => {
    listAdmins()
      .then(setAdmins)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load admins"));
  }, []);

  const form = useForm({
    defaultValues: {
      name: "",
      username: "",
      email: "",
      countryCode: "+91",
      mobile: "",
      password: "",
    },
    validators: { onChangeAsync: adminSchema, onSubmitAsync: adminSchema },
    onSubmit: async ({ value, formApi }) => {
      setFormError(null);
      setCreated(null);

      try {
        const admin = await createAdmin({
          name: value.name.trim(),
          username: value.username.trim(),
          email: value.email.trim(),
          countryCode: value.countryCode.trim(),
          mobile: value.mobile.trim(),
          password: value.password,
        });

        setAdmins((current) => [...(current ?? []), admin]);
        setCreated(`${admin.name} can now sign in with ${admin.email}`);
        formApi.reset();
      } catch (err) {
        setFormError(err instanceof ApiError ? err.message : "Could not create the admin");
      }
    },
  });

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Admins</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Admins have full access to this panel, including creating other admins.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          {error && <p className="p-6 text-sm text-red-600">{error}</p>}
          {!error && admins === null && <p className="p-6 text-sm text-zinc-500">Loading…</p>}
          {admins?.length === 0 && (
            <p className="p-6 text-sm text-zinc-500">No admins yet. Add one on the right.</p>
          )}

          {admins && admins.length > 0 && (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => (
                  <tr key={admin.id} className="border-b border-zinc-100 last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-medium text-zinc-900">{admin.name}</div>
                      <div className="text-xs text-zinc-500">@{admin.username}</div>
                    </td>
                    <td className="px-4 py-3 text-zinc-700">{admin.email}</td>
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
          <h2 className="text-sm font-semibold text-zinc-900">Add an admin</h2>

          {(
            [
              ["name", "Full name", "text"],
              ["username", "Username", "text"],
              ["email", "Email", "email"],
              ["countryCode", "Country code", "text"],
              ["mobile", "Mobile", "text"],
              ["password", "Temporary password", "password"],
            ] as const
          ).map(([field, label, type]) => (
            <form.Field key={field} name={field}>
              {(api) => (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-zinc-700" htmlFor={api.name}>
                    {label}
                  </label>
                  <input
                    id={api.name}
                    name={api.name}
                    type={type}
                    value={api.state.value}
                    onBlur={api.handleBlur}
                    onChange={(event) => api.handleChange(event.target.value)}
                    className={inputClass}
                  />
                  {api.state.meta.isTouched && api.state.meta.errors[0] && (
                    <p className="mt-1 text-sm text-red-600">{api.state.meta.errors[0]?.message}</p>
                  )}
                </div>
              )}
            </form.Field>
          ))}

          {formError && <p className="mt-4 text-sm text-red-600">{formError}</p>}
          {created && <p className="mt-4 text-sm text-green-700">{created}</p>}

          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-6 w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
              >
                {isSubmitting ? "Creating…" : "Create admin"}
              </button>
            )}
          </form.Subscribe>
        </form>
      </div>
    </>
  );
}
