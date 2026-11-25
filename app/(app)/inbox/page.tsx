import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { markAllRead } from "../briefs/actions";

export default async function Inbox() {
  const me = await requireStaff();
  const supabase = await createClient();
  const { data: rows } = await supabase.from("notifications").select("id, body, link, read_at, created_at").eq("user_id", me.id).order("created_at", { ascending: false }).limit(100);
  const unread = (rows ?? []).filter((r) => !r.read_at).length;
  return (
    <>
      <h1>Inbox</h1>
      <p className="sub">Tasks given to you, mentions, and work waiting on you.</p>
      {unread ? (
        <form action={markAllRead} style={{ margin: "14px 0" }}>
          <button className="btn ghost sm">Mark all as read</button>
        </form>
      ) : null}
      <div style={{ maxWidth: 720 }}>
        {(rows ?? []).map((r) => (
          <div key={r.id} className="offer" style={{ padding: "12px 0" }}>
            <span>
              {!r.read_at ? <span className="pill pink" style={{ marginRight: 10 }}>New</span> : null}
              {r.link ? <Link href={r.link}>{r.body}</Link> : r.body}
            </span>
            <span className="mute small">{String(r.created_at).slice(0, 16).replace("T", " ")}</span>
          </div>
        ))}
        {!rows || rows.length === 0 ? <p className="empty">Nothing for you yet.</p> : null}
      </div>
    </>
  );
}
