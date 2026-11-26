"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

export type BoardTask = {
  id: string; title: string; group: string; client: string | null; teamKey: string; teamName: string; status: string;
  dueLabel: string | null; late: boolean; urgent: boolean; priority: string; tone: string; owner: string | null; done: number; total: number; closed: boolean;
};
export type BoardGroup = { key: string; label: string; tone: string };

const initials = (name: string) => name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");

// The board. Columns are whatever the tasks are grouped by. Drag a card to
// another column to change it, click a card to open it beside the board, or
// type in the New row at the bottom of a column to add one.
export function TaskBoard({
  by, groups, tasks, query, team, move, add,
}: {
  by: string;
  groups: BoardGroup[];
  tasks: BoardTask[];
  query: string;
  team: string;
  move: (id: string, by: string, value: string) => Promise<void>;
  add: (by: string, value: string, team: string, formData: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const [local, setLocal] = useState<Record<string, string>>({});
  const [over, setOver] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [, start] = useTransition();
  const forms = useRef<Record<string, HTMLFormElement | null>>({});
  const groupOf = (t: BoardTask) => local[t.id] ?? t.group;
  const open = (id: string) => `/briefs?${query ? `${query}&` : ""}open=${id}`;
  const drop = (key: string, id: string) => {
    setOver(null);
    const task = tasks.find((t) => t.id === id);
    if (!task || groupOf(task) === key) return;
    setLocal((l) => ({ ...l, [id]: key }));
    start(async () => {
      await move(id, by, key);
      router.refresh();
    });
  };
  return (
    <div className="nboard">
      {groups.map((g) => {
        const items = tasks.filter((t) => groupOf(t) === g.key);
        return (
          <div
            key={g.key || "none"}
            className={over === g.key ? "ncol over" : "ncol"}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(g.key);
            }}
            onDragLeave={() => setOver((o) => (o === g.key ? null : o))}
            onDrop={(e) => drop(g.key, e.dataTransfer.getData("text/plain"))}
          >
            <div className="ncol-head">
              <span className={`ntag tone-${g.tone}`}>
                <i />
                {g.label}
              </span>
              <span className="ncount">{items.length}</span>
              <button type="button" className="nplus" aria-label={`Add a task to ${g.label}`} onClick={() => setAdding(g.key)}>
                +
              </button>
            </div>
            {items.map((t) => (
              <Link
                key={t.id}
                href={open(t.id)}
                scroll={false}
                draggable
                onDragStart={(e) => e.dataTransfer.setData("text/plain", t.id)}
                className={t.urgent && !t.closed ? "ncard urgent" : "ncard"}
              >
                <b>{t.title}</b>
                {t.client ? <span className="nprop">{t.client}</span> : null}
                {by !== "status" || g.key.startsWith("b:") ? (
                  <span className={`ntag sm tone-${t.tone}`}>
                    <i />
                    {t.status}
                  </span>
                ) : null}
                {t.priority === "High" || t.priority === "Super Urgent" ? (
                  <span className="nprop" style={{ color: t.priority === "Super Urgent" ? "var(--bad)" : "var(--warn)", fontWeight: 600 }}>
                    {t.priority}
                  </span>
                ) : null}
                {by !== "team" ? <span className={`teamtag t-${t.teamKey}`}>{t.teamName}</span> : null}
                {t.dueLabel ? (
                  <span className="nprop" style={{ color: t.late && !t.closed ? "var(--bad)" : undefined }}>
                    {t.late && !t.closed ? "Late, " : ""}
                    {t.dueLabel}
                  </span>
                ) : null}
                {t.total ? (
                  <span className="nprop">
                    {t.done} of {t.total} steps
                  </span>
                ) : null}
                {by !== "person" && t.owner ? (
                  <span className="nowner">
                    <i>{initials(t.owner)}</i>
                    {t.owner}
                  </span>
                ) : null}
              </Link>
            ))}
            {adding === g.key ? (
              <form
                ref={(el) => {
                  forms.current[g.key] = el;
                }}
                className="nadd-form"
                action={(fd) => {
                  setAdding(null);
                  start(async () => {
                    await add(by, g.key, team, fd);
                    router.refresh();
                  });
                }}
              >
                <input name="title" placeholder="Type a name and press Enter" autoFocus required onBlur={(e) => { if (!e.currentTarget.value) setAdding(null); }} />
              </form>
            ) : (
              <button type="button" className="nadd" onClick={() => setAdding(g.key)}>
                + New
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
