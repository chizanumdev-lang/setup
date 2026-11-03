"use client";
import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CaretLeft, CheckCircle, Circle, PencilSimple, Trash, XCircle } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { analyze, stepsFromSnapshot, sw } from "@/lib/checklist";
import { cls, fmtR, ms, rOf, taken, type Trade } from "@/lib/format";
import { StatusPill } from "@/components/LogView";
import Lightbox from "@/components/Lightbox";
import VerdictPanel, { VerdictPill } from "@/components/VerdictPanel";
import { effective, type ProofRow, type Verdict } from "@/lib/ai";
import { fetchProofRows, runCheck, saveOverride } from "@/lib/proofRows";
import { useProfile } from "@/lib/profile";
import { signedUrls, type TradeImage } from "@/lib/images";

export default function TradeDetail({ id }: { id: string }) {
  const router = useRouter();
  const [t, setT] = useState<Trade | null | undefined>(undefined);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");
  const [shots, setShots] = useState<(TradeImage & { url?: string })[]>([]);
  const [view, setView] = useState<number | null>(null);
  const { profile } = useProfile();
  const [ai, setAi] = useState<Record<string, Partial<ProofRow>>>({});
  const [checking, setChecking] = useState<string | null>(null);
  const [checkError, setCheckError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.from("trades").select("*").eq("id", id).maybeSingle().then(({ data }) => setT((data as Trade) ?? null));
    fetchProofRows(supabase, { tradeId: id }).then((rows) => setAi(Object.fromEntries(rows.map((r) => [r.id, r]))));
    supabase.from("trade_images").select("id,trade_id,path,label,phase,item_key").eq("trade_id", id).then(async ({ data }) => {
      const list = (data ?? []) as TradeImage[];
      const urls = await signedUrls(supabase, list.map((i) => i.path));
      setShots(list.map((i) => ({ ...i, url: urls[i.path] })));
    });
  }, [id]);

  const del = async () => {
    const supabase = createClient();
    if (shots.length) await supabase.storage.from("trade-images").remove(shots.map((s) => s.path));
    const { error } = await supabase.from("trades").delete().eq("id", id);
    if (error) { setError(error.message); return; }
    router.replace("/log");
  };

  const back = <Link href="/log" className="back" style={{ textDecoration: "none", color: "inherit" }}><CaretLeft size={18} weight="bold" />Back to log</Link>;
  if (t === undefined) return <section className="view">{back}<div className="skel" /><div className="skel" /></section>;
  if (t === null) return <section className="view">{back}<h1>Not found</h1><p className="lede">This trade doesn&apos;t exist or isn&apos;t yours.</p></section>;

  const rows: [string, React.ReactNode][] = [
    ["Setup", <StatusPill key="s" s={t.status} />],
    ["Outcome", t.outcome],
    ["Result", <span key="r" className={"num " + cls(rOf(t))}>{taken(t) ? fmtR(rOf(t)) : "-"}</span>],
  ];
  if (t.session) rows.push(["Session", t.session]);
  if (t.entry_type) rows.push(["Entry type", t.entry_type]);
  if (t.entry != null) rows.push(["Entry", String(t.entry)]);
  if (t.stop != null) rows.push(["Stop", String(t.stop)]);
  if (t.target != null) rows.push(["Target", String(t.target)]);
  if (t.tags?.length) rows.push(["Tags", t.tags.join(", ")]);
  const snap = stepsFromSnapshot(t.checklist_snapshot);
  const A = analyze(snap.steps);
  const keys = [...A.req, ...A.nogo, ...A.optional];
  // screenshots taken while ticking each step, in checklist order, so they read side by side
  const stepShots = snap.steps.flatMap((st) => st.items.flatMap(([k, title]) => shots.filter((s) => s.item_key === k && s.url).map((s) => ({ ...s, step: st.title, itemTitle: title }))));
  const otherShots = shots.filter((s) => !s.item_key);
  const rowOf = (s: (typeof stepShots)[number]): ProofRow => ({ id: s.id, path: s.path, item_key: s.item_key ?? "", ...ai[s.id] });
  const detailOf = (key: string) => { const d = A.items[key]?.d; return d ? sw(d, t.direction) : undefined; };
  const check = async (s: (typeof stepShots)[number]) => {
    setChecking(s.id); setCheckError("");
    const r = await runCheck({ imageId: s.id, title: sw(s.itemTitle, t.direction), detail: detailOf(s.item_key ?? ""), bias: t.direction });
    if (r.ok) setAi((m) => ({ ...m, [s.id]: { ...m[s.id], ...r.row } })); else setCheckError(r.error);
    setChecking(null);
  };
  const override = async (s: (typeof stepShots)[number], v: Verdict | null) => {
    const err = await saveOverride(createClient(), s.id, v);
    if (err) { setCheckError(err); return; }
    setCheckError("");
    setAi((m) => ({ ...m, [s.id]: { ...m[s.id], user_verdict: v } }));
  };
  const slides = stepShots.map((s) => ({
    url: s.url!, title: sw(s.itemTitle, t.direction), caption: sw(s.step, t.direction),
    aside: <VerdictPanel row={rowOf(s)} aiEnabled={profile.ai_enabled} busy={checking === s.id} error={checkError} onCheck={() => check(s)} onOverride={(v) => override(s, v)} />,
  }));
  rows.splice(1, 0, ["Strategy", snap.name + (snap.version ? ` v${snap.version}` : "")]);

  return (
    <section className="view">
      {back}
      <h1>{t.instrument} <span className={t.direction === "bull" ? "bullc" : "bearc"}>{t.direction === "bull" ? "Long" : "Short"}</span></h1>
      <p className="lede">{new Intl.DateTimeFormat(undefined, { dateStyle: "full", timeStyle: "short" }).format(ms(t))}</p>
      <dl className="dl">{rows.map(([k, v]) => <Fragment key={k}><dt>{k}</dt><dd>{v}</dd></Fragment>)}</dl>
      {t.notes_pre && <><h2 className="block-h">Notes before</h2><p style={{ margin: 0 }}>{t.notes_pre}</p></>}
      {t.notes_post && <><h2 className="block-h">Notes after</h2><p style={{ margin: 0 }}>{t.notes_post}</p></>}
      {stepShots.length > 0 && (
        <>
          <h2 className="block-h">Proof by step</h2>
          <p className="sub">Tap a screenshot to view it full size and swipe through the steps.</p>
          <div className="proofgrid">
            {stepShots.map((s, i) => (
              <figure key={s.id}>
                <button onClick={() => setView(i)} aria-label={`View proof for ${sw(s.itemTitle, t.direction)}`}><img src={s.url} alt="" /></button>
                <figcaption><b>{sw(s.itemTitle, t.direction)}</b><span>{sw(s.step, t.direction)}</span><VerdictPill v={effective(rowOf(s))} small /></figcaption>
              </figure>
            ))}
          </div>
        </>
      )}
      {otherShots.length > 0 && (
        <>
          <h2 className="block-h">Screenshots</h2>
          <div className="gallery">
            {otherShots.map((s) => s.url && (
              <figure key={s.id}>
                <a href={s.url} target="_blank" rel="noreferrer"><img src={s.url} alt={`${s.phase === "post" ? "After" : "Before"} screenshot${s.label ? ", " + s.label : ""}`} /></a>
                <figcaption>{s.phase === "post" ? "After" : "Before"}{s.label ? `: ${s.label}` : ""}</figcaption>
              </figure>
            ))}
          </div>
        </>
      )}
      <h2 className="block-h">Checklist at the time</h2>
      <ul className="snap">
        {keys.map((k) => {
          const on = !!t.ticks[k];
          const bad = A.items[k].r === 2;
          return (
            <li key={k}>
              {on ? (bad ? <XCircle size={16} weight="bold" className="bearc" /> : <CheckCircle size={16} weight="bold" className="bullc" />) : <Circle size={16} weight="bold" className="mutedc" />}
              <span className={on ? "" : "mutedc"}>{sw(A.items[k].t, t.direction)}{on && bad ? " (present)" : ""}</span>
            </li>
          );
        })}
      </ul>
      {view !== null && slides.length > 0 && <Lightbox slides={slides} index={Math.min(view, slides.length - 1)} setIndex={setView} onClose={() => setView(null)} />}
      <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 10 }}>
        <Link href={`/log/${id}/edit`} className="btn block" style={{ textDecoration: "none" }}><PencilSimple size={22} weight="bold" />Edit trade</Link>
        {!confirm ? (
          <button className="btn ghost block" onClick={() => setConfirm(true)}><Trash size={22} weight="bold" />Delete trade</button>
        ) : (
          <div className="confirm" role="alertdialog" aria-label="Confirm delete">
            <p>Delete this trade? This cannot be undone.</p>
            {error && <p className="msg err" role="alert">{error}</p>}
            <div className="g2"><button className="btn danger" onClick={del} autoFocus>Delete</button><button className="btn ghost" onClick={() => setConfirm(false)}>Keep</button></div>
          </div>
        )}
      </div>
    </section>
  );
}
