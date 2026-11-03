"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CaretLeft, Copy, PencilSimple, Plus, Trash } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { useStrategies } from "@/lib/useStrategies";
import { useAnalyses } from "@/lib/useAnalyses";
import { TEMPLATES, type Template } from "@/lib/templates";

export default function StrategyList() {
  const router = useRouter();
  const { strategies, error, reload } = useStrategies();
  const { items, dropStrategy } = useAnalyses();
  const [confirm, setConfirm] = useState<string | null>(null);
  const [failure, setFailure] = useState("");

  const del = async (id: string) => {
    const { error } = await createClient().from("checklists").delete().eq("id", id);
    if (error) { setFailure(error.message); return; }
    dropStrategy(id);
    setConfirm(null);
    reload();
  };
  const count = (steps: { items: unknown[] }[]) => steps.reduce((a, s) => a + s.items.length, 0);
  const [adding, setAdding] = useState<string | null>(null);
  const [added, setAdded] = useState<string | null>(null);

  // add a ready-made strategy to this account; it becomes an ordinary strategy the user can edit
  const addTemplate = async (t: Template) => {
    setAdding(t.id); setFailure("");
    const supabase = createClient();
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { router.replace("/login"); return; }
    const { error } = await supabase.from("checklists").insert({ user_id: u.user.id, name: t.name, items: t.steps, version: t.version });
    setAdding(null);
    if (error) { setFailure(error.message); return; }
    setAdded(t.name);
    reload();
  };
  const available = TEMPLATES.filter((t) => strategies && !strategies.some((s) => s.name === t.name));

  return (
    <section className="view">
      <Link href="/" className="back" style={{ textDecoration: "none", color: "inherit" }}><CaretLeft size={18} weight="bold" />Back to checklist</Link>
      <h1>Strategies</h1>
      <p className="lede">Candle Three is built in. Add your own checklists for other setups. Each trade remembers the strategy and version it used.</p>
      <button className="btn block" onClick={() => router.push("/strategies/new")}><Plus size={22} weight="bold" />New strategy</button>
      {added && <p className="msg" role="status" style={{ marginTop: 16 }}>Added &quot;{added}&quot;. Pick it on the Check screen, or edit it here.</p>}
      {(error || failure) && <p className="msg err" role="alert" style={{ marginTop: 16 }}>{failure || error}</p>}

      {available.length > 0 && (
        <div style={{ marginTop: 22 }}>
          <h2 className="block-h" style={{ marginTop: 0 }}>Templates</h2>
          {available.map((t) => (
            <div className="strat" key={t.id}>
              <div className="strat-main">
                <b>{t.name}</b>
                <span className="sub">{t.blurb}</span>
              </div>
              <button className="btn" style={{ minHeight: 44, fontSize: 16 }} onClick={() => addTemplate(t)} disabled={adding === t.id}><Plus size={20} weight="bold" />{adding === t.id ? "Adding" : "Add"}</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 22 }}>
        {strategies === null ? (
          <div aria-busy="true"><div className="skel" /><div className="skel" /></div>
        ) : (
          strategies.map((s) => (
            <div className="strat" key={s.id ?? "builtin"}>
              <div className="strat-main">
                <b>{s.name}</b>
                <span className="sub">{s.builtin ? "Built in" : `Version ${s.version}`}, {count(s.steps)} items{items.some((x) => x.sid === s.id) ? ", in use" : ""}</span>
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
