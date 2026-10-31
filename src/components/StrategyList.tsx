"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CaretLeft, Copy, PencilSimple, Plus, Trash } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { useStrategies } from "@/lib/useStrategies";
import { useDraft } from "@/lib/useDraft";

export default function StrategyList() {
  const router = useRouter();
  const { strategies, error, reload } = useStrategies();
  const { sid, setStrategy } = useDraft();
  const [confirm, setConfirm] = useState<string | null>(null);
  const [failure, setFailure] = useState("");

  const del = async (id: string) => {
    const { error } = await createClient().from("checklists").delete().eq("id", id);
    if (error) { setFailure(error.message); return; }
    if (sid === id) setStrategy(null);
    setConfirm(null);
    reload();
  };
  const count = (steps: { items: unknown[] }[]) => steps.reduce((a, s) => a + s.items.length, 0);

  return (
    <section className="view">
      <Link href="/" className="back" style={{ textDecoration: "none", color: "inherit" }}><CaretLeft size={18} weight="bold" />Back to checklist</Link>
      <h1>Strategies</h1>
      <p className="lede">Candle Three is built in. Add your own checklists for other setups. Each trade remembers the strategy and version it used.</p>
      <button className="btn block" onClick={() => router.push("/strategies/new")}><Plus size={22} weight="bold" />New strategy</button>
      {(error || failure) && <p className="msg err" role="alert" style={{ marginTop: 16 }}>{failure || error}</p>}

      <div style={{ marginTop: 22 }}>
        {strategies === null ? (
          <div aria-busy="true"><div className="skel" /><div className="skel" /></div>
        ) : (
          strategies.map((s) => (
            <div className="strat" key={s.id ?? "builtin"}>
              <div className="strat-main">
                <b>{s.name}</b>
                <span className="sub">{s.builtin ? "Built in" : `Version ${s.version}`}, {count(s.steps)} items{sid === s.id || (sid === null && s.builtin) ? ", in use" : ""}</span>
              </div>
              {confirm === s.id ? (
                <div className="confirm" role="alertdialog" aria-label="Confirm delete" style={{ gridColumn: "1 / -1" }}>
                  <p>Delete &quot;{s.name}&quot;? Trades you logged with it keep their record. This cannot be undone.</p>
                  <div className="g2"><button className="btn danger" onClick={() => del(s.id!)} autoFocus>Delete</button><button className="btn ghost" onClick={() => setConfirm(null)}>Keep</button></div>
                </div>
              ) : (
                <div className="row-actions">
                  {!s.builtin && <button className="icon-btn" onClick={() => router.push(`/strategies/${s.id}`)} aria-label={`Edit ${s.name}`}><PencilSimple size={18} weight="bold" /></button>}
                  <button className="icon-btn" onClick={() => router.push(`/strategies/new?from=${s.id ?? "builtin"}`)} aria-label={`Copy ${s.name}`}><Copy size={18} weight="bold" /></button>
                  {!s.builtin && <button className="icon-btn" onClick={() => setConfirm(s.id)} aria-label={`Delete ${s.name}`}><Trash size={18} weight="bold" /></button>}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
