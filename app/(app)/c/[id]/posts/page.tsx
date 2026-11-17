import { CHANNELS, loadWorkspace, STAGES, today } from "@/lib/workspace";
import { addPost, deletePost, reviewPost, setPostStage } from "../workspace-actions";

const PILL: Record<string, string> = {
  Draft: "pill",
  "Team lead review": "pill purple",
  "Client review": "pill pink",
  Approved: "pill good",
  Posted: "pill good",
};
// Rail colour says whose move it is: purple for 9SM, pink for the client, green once approved.
const RAIL = ["rail", "rail purple", "rail pink", "rail good", "rail good"];
const NEXT_LABEL = ["Send to team lead", "Send to client", "Mark approved", "Mark posted"];

export default async function Posts({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const { supabase, isStaff } = await loadWorkspace(id);
  // Operators only get rows the database lets them see: client review and later.
  const { data: posts } = await supabase
    .from("posts")
    .select("id, channels, publish_date, publish_time, body, status, feedback")
    .eq("client_id", id)
    .order("publish_date")
    .order("publish_time");

  const list = (
    <div className="card">
      <h2>{isStaff ? "Queue" : "Posts"}</h2>
      <div className="key">
        <span className="pill purple">With 9SM</span>
        <span className="pill pink">With the client</span>
        <span className="pill good">Approved</span>
      </div>
      <div className="stack">
        {(posts ?? []).map((p) => {
          const stage = (STAGES as readonly string[]).indexOf(p.status);
          return (
            <div key={p.id} className="post">
              <div className="post-top">
                <span>
                  {p.publish_date} at {String(p.publish_time).slice(0, 5)}, {p.channels.join(", ")}
                </span>
                <span className={PILL[p.status] ?? "pill"}>{p.status}</span>
              </div>
              <p className="post-body">{p.body}</p>
              <div className={RAIL[stage] ?? "rail"} role="img" aria-label={`Stage ${stage + 1} of 5: ${p.status}`}>
                {STAGES.map((s, i) => (
                  <i key={s} className={i <= stage ? "on" : undefined} />
                ))}
              </div>
              {isStaff && p.feedback ? <p className="msg">Client asked for changes: {p.feedback}</p> : null}
              {isStaff ? (
                <div className="row">
                  {stage >= 0 && stage < 4 ? (
                    <form action={setPostStage.bind(null, id, p.id, STAGES[stage + 1])}>
                      <button className="btn sm">{NEXT_LABEL[stage]}</button>
                    </form>
                  ) : null}
                  {stage > 0 && stage < 4 ? (
                    <form action={setPostStage.bind(null, id, p.id, "Draft")}>
                      <button className="btn ghost sm">Back to draft</button>
                    </form>
                  ) : null}
                  <form action={deletePost.bind(null, id, p.id)}>
                    <button className="btn ghost sm">Delete</button>
                  </form>
                </div>
              ) : p.status === "Client review" ? (
                <div className="row" style={{ alignItems: "flex-end" }}>
                  <form action={reviewPost.bind(null, id, p.id, true)}>
                    <button className="btn sm">Approve</button>
                  </form>
                  <form className="row" action={reviewPost.bind(null, id, p.id, false)} style={{ flex: 1 }}>
                    <input type="text" name="feedback" placeholder="What should change?" required style={{ flex: 1, minWidth: 160 }} />
                    <button className="btn ghost sm">Ask for changes</button>
                  </form>
                </div>
              ) : null}
            </div>
          );
        })}
        {!posts || posts.length === 0 ? (
          <p className="empty">{isStaff ? "No posts yet. Write the first one." : "Nothing waiting for you."}</p>
        ) : null}
      </div>
    </div>
  );

  if (!isStaff) {
    return (
      <>
        {error ? <div className="msg">{error}</div> : null}
        {list}
      </>
    );
  }
  return (
    <>
      {error ? <div className="msg">{error}</div> : null}
      <div className="grid">
        <div className="card">
          <h2>New post</h2>
          <form className="f" action={addPost.bind(null, id)}>
            <label>
              Post
              <textarea name="body" placeholder="Write the post" required />
            </label>
            <div>
              <div className="mute" style={{ fontSize: 12, marginBottom: 4 }}>
                Channels
              </div>
              <div className="chk">
                {CHANNELS.map((c, i) => (
                  <label key={c}>
                    <input type="checkbox" name="channels" value={c} defaultChecked={i === 0} />
                    {c}
                  </label>
                ))}
              </div>
            </div>
            <div className="row">
              <label>
                Date
                <input type="date" name="date" defaultValue={today()} required />
              </label>
              <label>
                Time
                <input type="time" name="time" defaultValue="18:00" required />
              </label>
            </div>
            <div>
              <button className="btn">Save as draft</button>
            </div>
          </form>
          <p className="mute" style={{ fontSize: 12 }}>
            Publishing is by hand for now. When a post is approved, post it and mark it posted. Operators only see a
            post once it reaches client review.
          </p>
        </div>
        {list}
      </div>
    </>
  );
}
