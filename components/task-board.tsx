"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export type BoardTask = {
  id: string; title: string; client: string | null; team: string; teamName: string; due: string | null; dueLabel: string | null;
  late: boolean; urgent: boolean; status: string; who: string; done: number; total: number;
};

// The board. Cards can be dragged between columns, or opened and changed there.
export function TaskBoard({ stages, tasks, move }: { stages: string[]; tasks: BoardTask[]; move: (id: string, status: string) => Promise<void> }) {
  const router = useRouter();
  const [local, setLocal] = useState<Record<string, string>>({});
  const [over, setOver] = useState<string | null>(null);
  const [, start] = useTransition();
  const statusOf = (t: BoardTask) => local[t.id] ?? t.status;
  const drop = (stage: string, id: string) => {
    setOver(null);
    const task = tasks.find((t) => t.id === id);
    if (!task || statusOf(task) === stage) return;
    setLocal((l) => ({ ...l, [id]: stage }));
    start(async () => {
      await move(id, stage);
      router.refresh();
    });
  };
  return (
    <div className="board">
      {stages.map((stage) => {
        const items = tasks.filter((t) => statusOf(t) === stage);
        return (
          <div
            key={stage}
            className={over === stage ? "board-col over" : "board-col"}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(stage);
            }}
            onDragLeave={() => setOver((o) => (o === stage ? null : o))}
            onDrop={(e) => drop(stage, e.dataTransfer.getData("text/plain"))}
          >
            <div className="board-head">
              {stage} <span>{items.length}</span>
            </div>
            {items.map((t) => (
              <Link
                key={t.id}
                href={`/briefs/${t.id}`}
                draggable
                onDragStart={(e) => e.dataTransfer.setData("text/plain", t.id)}
                className={t.urgent && stage !== "Delivered" ? "brief urgent" : "brief"}
              >
                <b>{t.title}</b>
                {t.client ? <span className="mute small">{t.client}</span> : null}
                <span className="brief-meta">
                  <span className={`teamtag t-${t.team}`}>{t.teamName}</span>
                  {t.dueLabel ? <span style={{ color: t.late && stage !== "Delivered" ? "var(--bad)" : undefined }}>{t.late && stage !== "Delivered" ? "Late, " : ""}{t.dueLabel}</span> : null}
                  {t.total ? <span className="mute">{t.done}/{t.total} done</span> : null}
                  <span className="mute">{t.who}</span>
                </span>
              </Link>
            ))}
            {items.length === 0 ? <p className="mute small" style={{ padding: "6px 2px" }}>Drop a task here.</p> : null}
          </div>
        );
      })}
    </div>
  );
}
