"use client";

import { usePathname } from "next/navigation";

// Staff only: flips between the staff side and what the client sees. It
// passes along the client that is open so the operator side opens on it.
export function ViewSwitch({ action, toOperator }: { action: (formData: FormData) => void; toOperator: boolean }) {
  const open = usePathname().match(/^\/c\/([^/]+)/)?.[1] ?? "";
  return (
    <form action={action}>
      <input type="hidden" name="view" value={toOperator ? "operator" : "staff"} />
      <input type="hidden" name="client" value={open} />
      <button className="btn sm" style={{ width: "100%" }}>
        {toOperator ? "See the operator side" : "Back to the staff side"}
      </button>
    </form>
  );
}
