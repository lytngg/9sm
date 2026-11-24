// A round staff photo, or their initials when there is no photo yet.
export function Avatar({ name, photoUrl, size = 44 }: { name: string; photoUrl?: string | null; size?: number }) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "?";
  const style = { width: size, height: size, fontSize: Math.round(size * 0.38) };
  if (photoUrl) {
    // Photos live in Supabase Storage, so a plain img is used instead of the image optimiser.
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="avatar" src={photoUrl} alt="" style={style} />;
  }
  return (
    <span className="avatar initials" style={style} aria-hidden="true">
      {initials}
    </span>
  );
}
