"use client";
import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CaretLeft, CheckCircle, Circle, Trash, XCircle } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { ITEMS, NOGO, OPTIONAL, REQ, sw } from "@/lib/checklist";
import { cls, fmtR, ms, rOf, taken, type Trade } from "@/lib/format";
import { StatusPill } from "@/components/LogView";

export default function TradeDetail({ id }: { id: string }) {
  const router = useRouter();
  const [t, setT] = useState<Trade | null | undefined>(undefined);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    createClient().from("trades").select("*").eq("id", id).maybeSingle().then(({ data }) => setT((data as Trade) ?? null));
  }, [id]);

  const del = async () => {
    const { error } = await createClient().from("trades").delete().eq("id", id);
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
  const keys = [...REQ, ...NOGO, ...OPTIONAL];

  return (
    <section className="view">
      {back}
      <h1>{t.instrument} <span className={t.direction === "bull" ? "bullc" : "bearc"}>{t.direction === "bull" ? "Long" : "Short"}</span></h1>
      <p className="lede">{new Intl.DateTimeFormat(undefined, { dateStyle: "full", timeStyle: "short" }).format(ms(t))}</p>
      <dl className="dl">{rows.map(([k, v]) => <Fragment key={k}><dt>{k}</dt><dd>{v}</dd></Fragment>)}</dl>
      {t.notes_pre && <><h2 className="block-h">Notes before</h2><p style={{ margin: 0 }}>{t.notes_pre}</p></>}
      {t.notes_post && <><h2 className="block-h">Notes after</h2><p style={{ margin: 0 }}>{t.notes_post}</p></>}
      <h2 className="block-h">Checklist at the time</h2>
      <ul className="snap">
        {keys.map((k) => {
          const on = !!t.ticks[k];
          const bad = ITEMS[k].r === 2;
          return (
            <li key={k}>
              {on ? (bad ? <XCircle size={16} weight="bold" className="bearc" /> : <CheckCircle size={16} weight="bold" className="bullc" />) : <Circle size={16} weight="bold" className="mutedc" />}
              <span className={on ? "" : "mutedc"}>{sw(ITEMS[k].t, t.direction)}{on && bad ? " (present)" : ""}</span>
            </li>
          );
        })}
      </ul>
      <div style={{ marginTop: 22 }}>
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
