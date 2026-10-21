"use client";

import { FormEvent, useState } from "react";

type WaitlistEntry = {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  created_at: string;
  released_at: string | null;
};

export default function AdminWaitlistPage() {
  const [password, setPassword] = useState("");
  const [entries, setEntries] = useState<WaitlistEntry[] | null>(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadWaitlist(event?: FormEvent) {
    event?.preventDefault();
    setError("");

    const response = await fetch("/api/admin/waitlist", {
      headers: { "x-admin-password": password },
    });
    const payload = await response.json();

    if (!response.ok) {
      setEntries(null);
      setError(payload.error ?? "Unauthorized");
      return;
    }

    setEntries(payload.entries);
  }

  async function release(id: string) {
    setBusyId(id);
    setError("");

    const response = await fetch("/api/admin/waitlist/release", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-password": password,
      },
      body: JSON.stringify({ id }),
    });
    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error ?? "Release failed");
      setBusyId(null);
      return;
    }

    await loadWaitlist();
    setBusyId(null);
  }

  return (
    <div className="min-h-full bg-white p-6 text-sm text-black">
      <h1 className="mb-4 text-xl font-semibold">Admin · Waitlist</h1>

      {entries === null ? (
        <form onSubmit={loadWaitlist} className="max-w-sm space-y-3">
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Admin password"
            className="w-full border border-neutral-300 px-3 py-2"
          />
          <button type="submit" className="border border-neutral-800 px-3 py-2">
            Unlock
          </button>
          {error ? <p className="text-red-700">{error}</p> : null}
        </form>
      ) : (
        <>
          {error ? <p className="mb-3 text-red-700">{error}</p> : null}
          <table className="w-full border-collapse border border-neutral-300">
            <thead>
              <tr className="bg-neutral-100 text-left">
                <th className="border border-neutral-300 px-2 py-1">ID</th>
                <th className="border border-neutral-300 px-2 py-1">Created</th>
                <th className="border border-neutral-300 px-2 py-1">Name</th>
                <th className="border border-neutral-300 px-2 py-1">Email</th>
                <th className="border border-neutral-300 px-2 py-1">Phone</th>
                <th className="border border-neutral-300 px-2 py-1">Status</th>
                <th className="border border-neutral-300 px-2 py-1">Action</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td
                    className="border border-neutral-300 px-2 py-1 font-mono text-xs break-all"
                    title={entry.id}
                  >
                    {entry.id}
                  </td>
                  <td className="border border-neutral-300 px-2 py-1">
                    {new Date(entry.created_at).toLocaleString()}
                  </td>
                  <td className="border border-neutral-300 px-2 py-1">{entry.name}</td>
                  <td className="border border-neutral-300 px-2 py-1">{entry.email}</td>
                  <td className="border border-neutral-300 px-2 py-1">{entry.phone}</td>
                  <td className="border border-neutral-300 px-2 py-1">{entry.status}</td>
                  <td className="border border-neutral-300 px-2 py-1">
                    {entry.status === "waiting" ? (
                      <button
                        type="button"
                        disabled={busyId === entry.id}
                        onClick={() => release(entry.id)}
                      >
                        {busyId === entry.id ? "Releasing…" : "Release"}
                      </button>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
