import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdmin } from "@/lib/supabase/admin";

const BUCKET = "trade-images";

/** Deletes the signed-in user's screenshots and their account. Foreign keys cascade to every table row. */
export async function POST() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let admin;
  try { admin = createAdmin(); } catch { return NextResponse.json({ error: "Account deletion isn't configured on this server." }, { status: 500 }); }

  // files live at <user id>/<trade id>/<file> and <user id>/drafts/<draft id>/<file>, so walk the folders
  const paths: string[] = [];
  const walk = async (dir: string, depth: number): Promise<void> => {
    const { data } = await admin.storage.from(BUCKET).list(dir, { limit: 1000 });
    for (const x of data ?? []) {
      if (x.id) paths.push(`${dir}/${x.name}`);          // a file
      else if (depth < 3) await walk(`${dir}/${x.name}`, depth + 1);   // a folder
    }
  };
  await walk(user.id, 0);
  for (let i = 0; i < paths.length; i += 100) {
    const r = await admin.storage.from(BUCKET).remove(paths.slice(i, i + 100));
    if (r.error) return NextResponse.json({ error: r.error.message }, { status: 500 });
  }

  const del = await admin.auth.admin.deleteUser(user.id);
  if (del.error) return NextResponse.json({ error: del.error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
