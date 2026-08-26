"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { StatusBadge } from "@/components/status-badge";
import { ApiError, listSubmissions, type KycStatus, type KycSubmission } from "@/lib/api";

const STATUSES: KycStatus[] = ["pending", "approved", "rejected"];

export default function KycQueuePage() {
  const [status, setStatus] = useState<KycStatus>("pending");
  const [submissions, setSubmissions] = useState<KycSubmission[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setSubmissions(null);
    setError(null);

    listSubmissions(status)
      .then((data) => {
        if (active) setSubmissions(data);
      })
      .catch((err) => {
        if (active) setError(err instanceof ApiError ? err.message : "Could not load submissions");
      });

    return () => {
      active = false;
    };
  }, [status]);

  return (
    <>
      <div className="flex items-center gap-2">
        {STATUSES.map((option) => (
          <button
            key={option}
            onClick={() => setStatus(option)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
              status === option
                ? "bg-zinc-900 text-white"
                : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100"
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}
      {!error && submissions === null && <p className="mt-6 text-sm text-zinc-500">Loading…</p>}

      {submissions?.length === 0 && (
        <p className="mt-6 text-sm text-zinc-500">No {status} submissions.</p>
      )}

      {submissions && submissions.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Account</th>
                <th className="px-4 py-3 font-medium">Name on passport</th>
                <th className="px-4 py-3 font-medium">Passport no.</th>
                <th className="px-4 py-3 font-medium">Nationality</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {submissions.map((submission) => (
                <tr key={submission.id} className="border-b border-zinc-100 last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium text-zinc-900">{submission.user?.name}</div>
                    <div className="text-xs text-zinc-500">{submission.user?.email}</div>
                  </td>
                  <td className="px-4 py-3 text-zinc-700">{submission.fullName}</td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-700">
                    {submission.passportNumber}
                  </td>
                  <td className="px-4 py-3 text-zinc-700">{submission.nationality}</td>
                  <td className="px-4 py-3 text-zinc-500">
                    {new Date(submission.submittedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={submission.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/kyc/${submission.id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      Review
                    </Link>
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
