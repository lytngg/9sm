// A row of checkboxes for picking from a fixed list, posted under one field name.
export function TagPicker({ name, options, selected = [] }: { name: string; options: string[]; selected?: string[] }) {
  return (
    <div className="chk">
      {options.map((o) => (
        <label key={o}>
          <input type="checkbox" name={name} value={o} defaultChecked={selected.includes(o)} />
          {o}
        </label>
      ))}
    </div>
  );
}

export function Tags({ items }: { items: string[] | null | undefined }) {
  if (!items || items.length === 0) return null;
  return (
    <span className="tags">
      {items.map((t) => (
        <span key={t} className="tag">
          {t}
        </span>
      ))}
    </span>
  );
}
