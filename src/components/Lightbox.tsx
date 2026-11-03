"use client";
import { useEffect, useRef } from "react";
import { CaretLeft, CaretRight, Trash, X } from "@phosphor-icons/react";

export type Slide = { url: string; title: string; caption?: string };

/** Full-size screenshot viewer on the native <dialog>, so focus, Esc and the backdrop behave like the platform. */
export default function Lightbox({ slides, index, setIndex, onClose, onRemove }: { slides: Slide[]; index: number; setIndex: (i: number) => void; onClose: () => void; onRemove?: (i: number) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const s = slides[index];

  // no cleanup close: React Strict Mode re-runs effects in development and a close here would fire onClose straight away
  useEffect(() => { const d = ref.current; if (d && !d.open) d.showModal(); }, []);

  const go = (d: number) => setIndex((index + d + slides.length) % slides.length);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "ArrowRight") go(1); if (e.key === "ArrowLeft") go(-1); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  if (!s) return null;
  return (
    <dialog ref={ref} className="lightbox" onClose={onClose} onClick={(e) => { if (e.target === ref.current) onClose(); }} aria-label={s.title}>
      <div className="lb-bar">
        <div className="lb-title"><b>{s.title}</b>{s.caption && <span>{s.caption}</span>}</div>
        <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={20} weight="bold" /></button>
      </div>
      <div className="lb-stage"><img src={s.url} alt={`${s.title}${s.caption ? ", " + s.caption : ""}`} /></div>
      <div className="lb-foot">
        {slides.length > 1 ? (
          <div className="row-actions">
            <button className="icon-btn" onClick={() => go(-1)} aria-label="Previous screenshot"><CaretLeft size={20} weight="bold" /></button>
            <span className="mono lb-count">{index + 1} / {slides.length}</span>
            <button className="icon-btn" onClick={() => go(1)} aria-label="Next screenshot"><CaretRight size={20} weight="bold" /></button>
          </div>
        ) : <span />}
        <div className="row-actions">
          <a className="btn ghost" href={s.url} target="_blank" rel="noreferrer" style={{ textDecoration: "none", minHeight: 44 }}>Original</a>
          {onRemove && <button className="btn danger" style={{ minHeight: 44 }} onClick={() => onRemove(index)}><Trash size={20} weight="bold" />Remove</button>}
        </div>
      </div>
    </dialog>
  );
}
