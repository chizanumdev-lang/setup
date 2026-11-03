"use client";
import type { SupabaseClient } from "@supabase/supabase-js";

export type Phase = "pre" | "post";
export type TradeImage = { id: string; trade_id: string | null; path: string; label: string | null; phase: Phase | null; item_key?: string | null };
export type Pending = { key: string; file: File; phase: Phase; label: string; preview: string };

const BUCKET = "trade-images";

/** Shrink a screenshot on the device before upload (max 1600px on the long side, JPEG). */
export async function resizeImage(file: File, max = 1600, quality = 0.82): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn't prepare the image.");
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("Couldn't prepare the image."))), "image/jpeg", quality));
}

/** Upload screenshots to the private bucket under <user id>/<trade id>/. Returns an error message or null. */
export async function uploadImages(supabase: SupabaseClient, userId: string, tradeId: string, items: Pending[]): Promise<string | null> {
  for (const it of items) {
    try {
      const blob = await resizeImage(it.file);
      const path = `${userId}/${tradeId}/${crypto.randomUUID()}.jpg`;
      const up = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: "image/jpeg" });
      if (up.error) return up.error.message;
      const row = await supabase.from("trade_images").insert({ trade_id: tradeId, user_id: userId, path, label: it.label.trim() || null, phase: it.phase });
      if (row.error) { await supabase.storage.from(BUCKET).remove([path]); return row.error.message; }
    } catch (e) {
      return e instanceof Error ? e.message : "Couldn't upload an image.";
    }
  }
  return null;
}

export async function signedUrls(supabase: SupabaseClient, paths: string[]): Promise<Record<string, string>> {
  if (!paths.length) return {};
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600);
  return Object.fromEntries((data ?? []).flatMap((d) => (d.signedUrl && d.path ? [[d.path, d.signedUrl] as [string, string]] : [])));
}

export async function deleteImage(supabase: SupabaseClient, img: TradeImage): Promise<string | null> {
  const a = await supabase.storage.from(BUCKET).remove([img.path]);
  if (a.error) return a.error.message;
  const b = await supabase.from("trade_images").delete().eq("id", img.id);
  return b.error ? b.error.message : null;
}

/** Upload one proof screenshot for a checklist step while the analysis is still a draft. */
export async function uploadStepProof(supabase: SupabaseClient, userId: string, draftId: string, itemKey: string, file: File): Promise<{ id: string; path: string } | { error: string }> {
  try {
    const blob = await resizeImage(file);
    const path = `${userId}/drafts/${draftId}/${crypto.randomUUID()}.jpg`;
    const up = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: "image/jpeg" });
    if (up.error) return { error: up.error.message };
    const row = await supabase.from("trade_images").insert({ draft_id: draftId, user_id: userId, item_key: itemKey, path }).select("id").single();
    if (row.error || !row.data) { await supabase.storage.from(BUCKET).remove([path]); return { error: row.error?.message ?? "Couldn't save the screenshot." }; }
    return { id: row.data.id as string, path };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't upload the screenshot." };
  }
}
