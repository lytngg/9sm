import type { SupabaseClient } from "@supabase/supabase-js";
import { FILES_BUCKET, MAX_UPLOAD } from "@/lib/workspace";

const IMAGE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
const DOC_TYPES: Record<string, string> = { ...IMAGE_TYPES, "application/pdf": "pdf" };

// Uploads one file into a client's private folder. Returns the stored path,
// null when no file was chosen, or an error message to show the person.
export async function uploadClientFile(
  supabase: SupabaseClient,
  clientId: string,
  folder: "posts" | "brand" | "requests",
  file: FormDataEntryValue | null,
  allowPdf = false,
): Promise<{ path: string | null; error?: string }> {
  if (!(file instanceof File) || file.size === 0) return { path: null };
  const ext = (allowPdf ? DOC_TYPES : IMAGE_TYPES)[file.type];
  if (!ext) return { path: null, error: allowPdf ? "Use a PDF or an image." : "Use a JPEG, PNG, WebP or GIF image." };
  if (file.size > MAX_UPLOAD) return { path: null, error: "That file is over 4 MB. Use a smaller one, or paste a link instead." };
  const path = `${clientId}/${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(FILES_BUCKET).upload(path, file, { contentType: file.type });
  if (error) return { path: null, error: "The file did not upload. Try again." };
  return { path };
}

// Short-lived links for private files. Only works for files this person may see.
export async function signedUrls(supabase: SupabaseClient, paths: (string | null | undefined)[]) {
  const wanted = [...new Set(paths.filter((p): p is string => Boolean(p)))];
  const out: Record<string, string> = {};
  if (wanted.length === 0) return out;
  const { data } = await supabase.storage.from(FILES_BUCKET).createSignedUrls(wanted, 3600);
  for (const row of data ?? []) if (row.path && row.signedUrl) out[row.path] = row.signedUrl;
  return out;
}
