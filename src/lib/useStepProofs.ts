"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { deleteImage, signedUrls, uploadStepProof, type TradeImage } from "@/lib/images";

export type Proof = { id: string; path: string; item_key: string; url?: string };

/** Screenshot proof attached to the ticked steps of one analysis. */
export function useStepProofs(draftId: string | undefined, flush: () => Promise<string | null>) {
  const supabase = useMemo(() => createClient(), []);
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setProofs([]); setError("");
    if (!draftId) return;
    let alive = true;
    supabase.from("trade_images").select("id,path,item_key").eq("draft_id", draftId).order("id").then(async ({ data }) => {
      if (!alive) return;
      const rows = (data ?? []).filter((r) => r.item_key) as { id: string; path: string; item_key: string }[];
      const urls = await signedUrls(supabase, rows.map((r) => r.path));
      if (alive) setProofs(rows.map((r) => ({ ...r, url: urls[r.path] })));
    });
    return () => { alive = false; };
  }, [draftId, supabase]);

  const add = useCallback(async (itemKey: string, files: FileList | File[]) => {
    if (!draftId) return;
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!list.length) { setError("Choose an image file."); return; }
    setBusy(itemKey); setError("");
    const synced = await flush();                       // the analysis must exist on the server first
    if (synced) { setBusy(null); setError("Couldn't reach the server, so the screenshot wasn't saved. Try again when you're online."); return; }
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setBusy(null); setError("Sign in again to add screenshots."); return; }
    for (const f of list) {
      const r = await uploadStepProof(supabase, u.user.id, draftId, itemKey, f);
      if ("error" in r) { setError(r.error); break; }
      const urls = await signedUrls(supabase, [r.path]);
      setProofs((p) => [...p, { id: r.id, path: r.path, item_key: itemKey, url: urls[r.path] }]);
    }
    setBusy(null);
  }, [draftId, flush, supabase]);

  const remove = useCallback(async (p: Proof) => {
    const err = await deleteImage(supabase, { id: p.id, path: p.path, trade_id: null, label: null, phase: null } as TradeImage);
    if (err) { setError(err); return; }
    setProofs((l) => l.filter((x) => x.id !== p.id));
  }, [supabase]);

  useEffect(() => {
    if (!draftId) return;
    try { if (proofs.length) localStorage.setItem("c3-hasproof:" + draftId, "1"); else localStorage.removeItem("c3-hasproof:" + draftId); } catch {}
  }, [proofs.length, draftId]);

  const byKey = useMemo(() => {
    const m: Record<string, Proof[]> = {};
    proofs.forEach((p) => (m[p.item_key] = m[p.item_key] || []).push(p));
    return m;
  }, [proofs]);

  return { byKey, busy, error, add, remove, count: proofs.length, clearError: () => setError("") };
}
