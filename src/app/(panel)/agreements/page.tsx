"use client";

import { useEffect, useState } from "react";

import { ApiError, fetchSignedAgreementUrl, listSignedAgreements, type SignedAgreement } from "@/lib/api";

export default function AgreementsPage() {
  const [rows, setRows] = useState<SignedAgreement[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    listSignedAgreements()
      .then(setRows)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Could not load signed agreements")
      );
  }, []);

  async function download(agreement: SignedAgreement) {
    if (!agreement.user) return;
    setBusyId(agreement.id);

    try {
      const url = await fetchSignedAgreementUrl(agreement.user._id);
      window.open(url, "_blank");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not open the signed agreement");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Signed Agreements</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Every customer signs the Terms &amp; Service Agreement once, after their plan or trial
        activates. Each row here is a retained, timestamped signature.
      </p>

      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}
      {!error && rows === null && <p className="mt-6 text-sm text-zinc-500">Loading…</p>}
      {rows?.length === 0 && (
        <p className="mt-6 text-sm text-zinc-500">Nobody has signed the agreement yet.</p>
      )}

      {rows && rows.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Signed as</th>
                <th className="px-4 py-3 font-medium">Version</th>
                <th className="px-4 py-3 font-medium">Signed at</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-zinc-100 last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium text-zinc-900">{row.user?.name ?? "—"}</div>
                    <div className="text-xs text-zinc-500">{row.user?.email}</div>
                  </td>
                  <td className="px-4 py-3 text-zinc-700">{row.signerName}</td>
                  <td className="px-4 py-3 text-zinc-500">{row.documentVersion}</td>
                  <td className="px-4 py-3 text-zinc-500">
                    {new Date(row.signedAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => download(row)}
                      disabled={busyId === row.id || !row.user}
                      className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-40"
                    >
                      {busyId === row.id ? "Opening…" : "View PDF"}
                    </button>
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
