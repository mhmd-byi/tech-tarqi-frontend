"use client";

import { useForm } from "@tanstack/react-form";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import * as yup from "yup";

import { StatusBadge } from "@/components/status-badge";
import {
  ApiError,
  fetchImageUrl,
  getSubmission,
  reviewSubmission,
  type KycSubmission,
} from "@/lib/api";

const reviewSchema = yup.object({
  decision: yup.string().defined(),
  rejectionReason: yup
    .string()
    .defined()
    .when("decision", {
      is: "rejected",
      then: (schema) => schema.trim().required("Give the applicant a reason before rejecting."),
    }),
});

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="mt-0.5 text-zinc-900">{value}</dd>
    </div>
  );
}

function DocumentImage({ id, type, label }: { id: string; type: "passport" | "selfie"; label: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;

    fetchImageUrl(id, type)
      .then((result) => {
        objectUrl = result;
        setUrl(result);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load image"));

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id, type]);

  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <div className="flex min-h-64 items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
        {error && <p className="p-4 text-sm text-red-600">{error}</p>}
        {!error && !url && <p className="p-4 text-sm text-zinc-500">Loading…</p>}
        {url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={label} className="max-h-[32rem] w-full object-contain" />
        )}
      </div>
    </div>
  );
}

export default function KycReviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [submission, setSubmission] = useState<KycSubmission | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: { decision: "", rejectionReason: "" },
    validators: { onSubmit: reviewSchema },
    onSubmit: async ({ value }) => {
      setActionError(null);

      try {
        await reviewSubmission(
          id,
          value.decision as "approved" | "rejected",
          value.rejectionReason.trim() || undefined
        );
        router.push("/kyc");
      } catch (err) {
        setActionError(err instanceof ApiError ? err.message : "Something went wrong");
      }
    },
  });

  function submitDecision(decision: "approved" | "rejected") {
    form.setFieldValue("decision", decision);
    form.handleSubmit();
  }

  useEffect(() => {
    let active = true;

    getSubmission(id)
      .then((data) => {
        if (active) setSubmission(data);
      })
      .catch((err) => {
        if (active) setLoadError(err instanceof ApiError ? err.message : "Could not load submission");
      });

    return () => {
      active = false;
    };
  }, [id]);

  if (loadError) return <p className="text-sm text-red-600">{loadError}</p>;
  if (!submission) return <p className="text-sm text-zinc-500">Loading…</p>;

  return (
    <>
      <Link href="/kyc" className="text-sm font-medium text-blue-600 hover:underline">
        ← Back to queue
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          {submission.user?.name}
        </h1>
        <StatusBadge status={submission.status} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-zinc-900">Details provided</h2>
          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <Field label="Name on passport" value={submission.fullName} />
            <Field label="Passport number" value={submission.passportNumber} />
            <Field label="Nationality" value={submission.nationality} />
            <Field label="Date of birth" value={formatDate(submission.dateOfBirth)} />
            <Field label="Passport expiry" value={formatDate(submission.expiryDate)} />
            <Field label="Submitted" value={formatDate(submission.submittedAt)} />
          </dl>

          <h2 className="mt-6 text-sm font-semibold text-zinc-900">Account</h2>
          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <Field label="Username" value={submission.user?.username} />
            <Field label="Email" value={submission.user?.email} />
            <Field
              label="Mobile"
              value={`${submission.user?.countryCode} ${submission.user?.mobile}`}
            />
          </dl>

          {submission.status === "rejected" && submission.rejectionReason && (
            <p className="mt-6 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              Rejected: {submission.rejectionReason}
            </p>
          )}
        </div>

        <div className="space-y-6">
          <DocumentImage id={id} type="passport" label="Passport photo page" />
          <DocumentImage id={id} type="selfie" label="Selfie" />
        </div>
      </div>

      {submission.status === "pending" && (
        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-zinc-900">Decision</h2>

          <form.Field name="rejectionReason">
            {(field) => (
              <>
                <label
                  className="mt-4 block text-sm font-medium text-zinc-700"
                  htmlFor={field.name}
                >
                  Reason (required to reject)
                </label>
                <textarea
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  rows={3}
                  placeholder="e.g. The passport photo is blurry — please retake it in better light."
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500"
                />
                {field.state.meta.errors[0] && (
                  <p className="mt-1 text-sm text-red-600">{field.state.meta.errors[0]?.message}</p>
                )}
              </>
            )}
          </form.Field>

          {actionError && <p className="mt-3 text-sm text-red-600">{actionError}</p>}

          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => submitDecision("approved")}
                  disabled={isSubmitting}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  onClick={() => submitDecision("rejected")}
                  disabled={isSubmitting}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            )}
          </form.Subscribe>
        </div>
      )}
    </>
  );
}
