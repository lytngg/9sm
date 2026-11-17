import { loadWorkspace, REQUEST_KINDS, today } from "@/lib/workspace";
import { addRequest, deleteRequest, setRequestStatus } from "../workspace-actions";

const PILL: Record<string, string> = { New: "pill purple", Scheduled: "pill blue", Done: "pill good" };

export default async function Requests({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const { supabase, isStaff } = await loadWorkspace(id);
  const { data: requests } = await supabase
    .from("requests")
    .select("id, for_date, kind, details, status")
    .eq("client_id", id)
    .order("created_at", { ascending: false });
  return (
    <>
      {error ? <div className="msg">{error}</div> : null}
      <div className="grid">
        <div className="card">
          <h2>{isStaff ? "Requests from this client" : "Your requests"}</h2>
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>For date</th>
                  <th>Type</th>
                  <th>Details</th>
                  <th>Status</th>
                  {isStaff ? <th /> : null}
                </tr>
              </thead>
              <tbody>
                {(requests ?? []).map((r) => (
                  <tr key={r.id}>
                    <td>{r.for_date}</td>
                    <td>{r.kind}</td>
                    <td>{r.details}</td>
                    <td>
                      <span className={PILL[r.status] ?? "pill"}>{r.status}</span>
                    </td>
                    {isStaff ? (
                      <td>
                        <div className="row">
                          {r.status === "New" ? (
                            <form action={setRequestStatus.bind(null, id, r.id, "Scheduled")}>
                              <button className="btn sm">Schedule</button>
                            </form>
                          ) : null}
                          {r.status === "Scheduled" ? (
                            <form action={setRequestStatus.bind(null, id, r.id, "Done")}>
                              <button className="btn sm">Done</button>
                            </form>
                          ) : null}
                          <form action={deleteRequest.bind(null, id, r.id)}>
                            <button className="btn ghost sm">Delete</button>
                          </form>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
                {!requests || requests.length === 0 ? (
                  <tr>
                    <td colSpan={isStaff ? 5 : 4} className="mute">
                      Nothing here yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <h2>{isStaff ? "Log a request" : "Tell the team"}</h2>
          <form className="f" action={addRequest.bind(null, id)}>
            <div className="row">
              <label>
                Type
                <select name="kind">
                  {REQUEST_KINDS.map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>
              </label>
              <label>
                Date
                <input type="date" name="date" defaultValue={today()} required />
              </label>
            </div>
            <label>
              {isStaff ? "Details" : "What should we know or post?"}
              <textarea name="details" placeholder="Offer details, terms, codes, links" required />
            </label>
            <div>
              <button className="btn">{isStaff ? "Log request" : "Send to 9SM"}</button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
