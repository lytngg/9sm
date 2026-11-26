import type { Flow } from "@/lib/flows";

// The extra inputs a team's request form asks for. Values are saved with the
// task under the field's key.
export function FlowFields({ flow, values }: { flow: Flow; values?: Record<string, string> }) {
  return (
    <>
      {flow.fields.map((f) => (
        <label key={f.key}>
          {f.label}
          {f.kind === "select" ? (
            <select name={`cf_${f.key}`} defaultValue={values?.[f.key] ?? ""}>
              <option value="">Not set</option>
              {(f.options ?? []).map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          ) : (
            <input type={f.kind === "date" ? "date" : "text"} name={`cf_${f.key}`} defaultValue={values?.[f.key] ?? ""} placeholder={f.hint} />
          )}
        </label>
      ))}
    </>
  );
}
