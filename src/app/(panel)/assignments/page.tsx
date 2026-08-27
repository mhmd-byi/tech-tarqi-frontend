"use client";

import { useCallback, useEffect, useState } from "react";

import {
  ApiError,
  archiveAssignment,
  assignProvider,
  listAssignments,
  listProviders,
  type AssignmentRow,
  type Provider,
} from "@/lib/api";

export default function AssignmentsPage() {
  const [rows, setRows] = useState<AssignmentRow[] | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [choice, setChoice] = useState<Record<string, string>>({});
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);

    try {
      const [assignments, providerList] = await Promise.all([listAssignments(), listProviders()]);
      setRows(assignments);
      setProviders(providerList);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load assignments");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAssign(userId: string) {
    const providerId = choice[userId];
    if (!providerId) return;

    setBusyUserId(userId);
    setError(null);

    try {
      await assignProvider(userId, providerId);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not assign the provider");
    } finally {
      setBusyUserId(null);
    }
  }

  async function handleUnassign(userId: string, assignmentId: string) {
    setBusyUserId(userId);
    setError(null);

    try {
      await archiveAssignment(assignmentId);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not unassign the provider");
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Assignments</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Each user has one provider at a time. Changing it archives the previous chat — both sides
        keep reading it, but nobody can post there again.
      </p>

      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}
      {!error && rows === null && <p className="mt-6 text-sm text-zinc-500">Loading…</p>}
      {providers.length === 0 && rows !== null && (
        <p className="mt-6 text-sm text-amber-700">
          Create a service provider first — there is nobody to assign yet.
        </p>
      )}

      {rows && rows.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Current provider</th>
                <th className="px-4 py-3 font-medium">Change to</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ user, assignment }) => (
                <tr key={user.id} className="border-b border-zinc-100 last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium text-zinc-900">{user.name}</div>
                    <div className="text-xs text-zinc-500">{user.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    {assignment ? (
                      <span className="text-zinc-900">{assignment.provider.name}</span>
                    ) : (
                      <span className="text-zinc-400">Unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={choice[user.id] ?? ""}
                      onChange={(event) =>
                        setChoice((current) => ({ ...current, [user.id]: event.target.value }))
                      }
                      className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm outline-none focus:border-brand"
                    >
                      <option value="">Select a provider…</option>
                      {providers
                        .filter((provider) => provider.id !== assignment?.provider.id)
                        .map((provider) => (
                          <option key={provider.id} value={provider.id}>
                            {provider.name}
                          </option>
                        ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => handleAssign(user.id)}
                      disabled={!choice[user.id] || busyUserId === user.id}
                      className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-40"
                    >
                      {assignment ? "Reassign" : "Assign"}
                    </button>
                    {assignment && (
                      <button
                        onClick={() => handleUnassign(user.id, assignment.id)}
                        disabled={busyUserId === user.id}
                        className="ml-2 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-40"
                      >
                        Unassign
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rows?.length === 0 && <p className="mt-6 text-sm text-zinc-500">No app users yet.</p>}
    </>
  );
}
