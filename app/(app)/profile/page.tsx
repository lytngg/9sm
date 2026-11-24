import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/avatar";
import { saveProfile } from "./actions";

export default async function Profile({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const profile = await requireStaff();
  const { error, saved } = await searchParams;
  const supabase = await createClient();
  const { data: me } = await supabase
    .from("profiles")
    .select("full_name, title, photo_url")
    .eq("id", profile.id)
    .maybeSingle();
  const name = me?.full_name ?? "";
  return (
    <>
      <h1>Your profile</h1>
      <p className="sub">
        Clients you look after see your name, title and photo in their workspace. They do not see your email.
      </p>
      {error ? <div className="msg">{error}</div> : null}
      {saved ? <div className="msg ok">Profile saved.</div> : null}
      <div className="grid">
        <div className="card">
          <form className="f" action={saveProfile}>
            <div className="smm">
              <Avatar name={name || profile.email} photoUrl={me?.photo_url} size={64} />
              <label style={{ flex: 1 }}>
                Photo
                <input type="file" name="photo" accept="image/jpeg,image/png,image/webp" />
              </label>
            </div>
            <label>
              Name
              <input type="text" name="name" defaultValue={name} required />
            </label>
            <label>
              Title
              <input type="text" name="title" defaultValue={me?.title ?? ""} placeholder="Social Media Manager" />
            </label>
            <div>
              <button className="btn">Save profile</button>
            </div>
          </form>
          <p className="mute small">JPEG, PNG or WebP, up to 2 MB. A square photo works best.</p>
        </div>
      </div>
    </>
  );
}
