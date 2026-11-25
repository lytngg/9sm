"use client";

import Link from "next/link";
import { useState } from "react";

export type ClientRow = { id: string; name: string; tags: string[]; smm: string | null; done: number; total: number; waiting: number };

// The staff client list. Typing in the box narrows it by brand, type or manager.
export function ClientTable({ rows }: { rows: ClientRow[] }) {
  const [q, setQ] = useState("");
  const [mine, setMine] = useState("");
  const needle = q.trim().toLowerCase();
  const managers = [...new Set(rows.map((r) => r.smm).filter((s): s is string => Boolean(s)))].sort();
  const shown = rows.filter(
    (r) =>
      (!mine || r.smm === mine) &&
      (!needle || r.name.toLowerCase().includes(needle) || r.tags.some((t) => t.toLowerCase().includes(needle))),
  );
  return (
    <>
      <div className="row" style={{ margin: "0 0 14px" }}>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search brands or types"
          aria-label="Search clients"
          style={{ flex: 1, minWidth: 200, maxWidth: 360 }}
        />
        <select value={mine} onChange={(e) => setMine(e.target.value)} aria-label="Filter by social media manager">
          <option value="">Every manager</option>
          {managers.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
        <span className="mute small">
          {shown.length} of {rows.length}
        </span>
      </div>
      <div className="tw">
        <table>
          <thead>
            <tr>
              <th>Client</th>
              <th>Type</th>
              <th>Social media manager</th>
              <th>Posts the client has not approved yet</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link href={`/c/${c.id}`}>{c.name}</Link>
                </td>
                <td className="mute">{c.tags.join(", ")}</td>
                <td>{c.smm ?? <span className="mute">Not set</span>}</td>
                <td>{c.waiting ? <span className="pill pink">{c.waiting} waiting, chase them</span> : <span className="mute">None</span>}</td>
                <td>
                  {c.done === c.total ? (
                    <span className="pill good">Live</span>
                  ) : (
                    <span className="pill purple">
                      Onboarding, {c.done} of {c.total}
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {shown.length === 0 ? (
              <tr>
                <td colSpan={5} className="mute">
                  {rows.length ? "No brand matches that." : "No clients yet. Add the first one."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
