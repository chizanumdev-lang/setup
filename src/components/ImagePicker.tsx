"use client";
import { useEffect, useRef, useState } from "react";
import { ImageSquare, Trash, X } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { deleteImage, signedUrls, type Pending, type Phase, type TradeImage } from "@/lib/images";

/** Chart screenshots for a trade: existing ones (edit mode) and new ones waiting to upload. */
export default function ImagePicker({ tradeId, pending, setPending, disabled }: { tradeId?: string; pending: Pending[]; setPending: (p: Pending[]) => void; disabled?: boolean }) {
  const pick = useRef<HTMLInputElement>(null);
  const [existing, setExisting] = useState<TradeImage[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<Phase>("pre");
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (!tradeId) return;
    const supabase = createClient();
    supabase.from("trade_images").select("id,trade_id,path,label,phase").eq("trade_id", tradeId).then(async ({ data }) => {
      const list = (data ?? []) as TradeImage[];
      setExisting(list);
      setUrls(await signedUrls(supabase, list.map((i) => i.path)));
    });
  }, [tradeId]);

  useEffect(() => () => pending.forEach((p) => URL.revokeObjectURL(p.preview)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const add = (files: FileList | null) => {
    if (!files) return;
    const next: Pending[] = [];
    for (const f of Array.from(files)) {
      if (!f.type.startsWith("image/")) { setError("Only image files can be attached."); continue; }
      next.push({ key: crypto.randomUUID(), file: f, phase, label: "", preview: URL.createObjectURL(f) });
    }
    if (next.length) { setError(""); setPending([...pending, ...next]); }
    if (pick.current) pick.current.value = "";
  };

  const remove = async (img: TradeImage) => {
    const err = await deleteImage(createClient(), img);
    if (err) { setError(err); return; }
    setExisting((l) => l.filter((x) => x.id !== img.id));
    setConfirm(null);
  };

  return (
    <div className="f">
      <span className="l">Chart screenshots</span>
      <span className="h">Add the daily, 4H and 15m charts before the trade, and the result after. They are stored privately and resized on your device first.</span>
      <div className="ed-row" style={{ marginTop: 6 }}>
        <div className="seg plain" role="group" aria-label="Screenshots are from">
          <button type="button" aria-pressed={phase === "pre"} onClick={() => setPhase("pre")}>Before</button>
          <button type="button" aria-pressed={phase === "post"} onClick={() => setPhase("post")}>After</button>
        </div>
        <button type="button" className="btn ghost" onClick={() => pick.current?.click()} disabled={disabled}><ImageSquare size={20} weight="bold" />Add</button>
        <input ref={pick} type="file" accept="image/*" multiple hidden onChange={(e) => add(e.target.files)} />
      </div>
      {error && <p className="msg err" role="alert">{error}</p>}
      <div className="shots">
        {existing.map((i) => (
          <figure key={i.id}>
            {urls[i.path] ? <img src={urls[i.path]} alt={`${i.phase === "post" ? "After" : "Before"} screenshot${i.label ? ", " + i.label : ""}`} /> : <div className="skel" />}
            <figcaption>{i.phase === "post" ? "After" : "Before"}{i.label ? `: ${i.label}` : ""}</figcaption>
            {confirm === i.id
              ? <div className="ed-row"><button type="button" className="btn danger" onClick={() => remove(i)}>Delete</button><button type="button" className="btn ghost" onClick={() => setConfirm(null)}>Keep</button></div>
              : <button type="button" className="icon-btn shot-x" onClick={() => setConfirm(i.id)} aria-label="Delete screenshot"><Trash size={18} weight="bold" /></button>}
          </figure>
        ))}
        {pending.map((p) => (
          <figure key={p.key}>
            <img src={p.preview} alt={`New ${p.phase === "post" ? "after" : "before"} screenshot`} />
            <input type="text" aria-label="Caption" placeholder="Caption (e.g. 4H)" value={p.label} onChange={(e) => setPending(pending.map((x) => (x.key === p.key ? { ...x, label: e.target.value } : x)))} />
            <figcaption>{p.phase === "post" ? "After" : "Before"}, uploads when you save</figcaption>
            <button type="button" className="icon-btn shot-x" onClick={() => { URL.revokeObjectURL(p.preview); setPending(pending.filter((x) => x.key !== p.key)); }} aria-label="Remove screenshot"><X size={18} weight="bold" /></button>
          </figure>
        ))}
      </div>
    </div>
  );
}
