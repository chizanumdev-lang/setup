"use client";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, CaretDown, X } from "@phosphor-icons/react";

export type Opt = { value: string; label: string; hint?: string };

type Props = {
  label: string;               // accessible name, also the sheet title on phones
  value: string;
  options: Opt[];
  onChange: (v: string) => void;
  id?: string;
  placeholder?: string;
  searchable?: boolean;        // filter box for long lists (timezones)
  creatable?: boolean;         // allow a typed value that is not in the list (instruments)
  size?: "field" | "compact";
  hideLabel?: boolean;
};

const PHONE = "(max-width: 639px)";

/** Listbox dropdown in the field-book style. A popover on wide screens, a bottom sheet on phones. */
export default function Select({ label, value, options, onChange, id, placeholder, searchable, creatable, size = "field", hideLabel }: Props) {
  const uid = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [phone, setPhone] = useState(false);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number; width: number; max: number } | null>(null);
  const typed = useRef({ s: "", t: 0 });

  const showSearch = !!(searchable || creatable);
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const base = needle ? options.filter((o) => o.label.toLowerCase().includes(needle) || o.value.toLowerCase().includes(needle)) : options;
    if (creatable && q.trim() && !options.some((o) => o.value.toLowerCase() === q.trim().toLowerCase())) {
      return [{ value: q.trim().toUpperCase(), label: `Use “${q.trim().toUpperCase()}”` }, ...base];
    }
    return base;
  }, [options, q, creatable]);

  const current = options.find((o) => o.value === value);
  const text = current?.label ?? (value || "");

  const close = useCallback((refocus = true) => {
    setOpen(false); setQ("");
    if (refocus) trigger.current?.focus();
  }, []);

  const place = useCallback(() => {
    const el = trigger.current;
    if (!el) return;
    const mq = window.matchMedia(PHONE).matches;
    setPhone(mq);
    if (mq) { setPos(null); return; }
    const r = el.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - 12, above = r.top - 12;
    const flip = below < 220 && above > below;
    const max = Math.max(160, Math.min(340, flip ? above : below));
    const width = Math.max(r.width, 240);
    const left = Math.min(Math.max(8, r.left), window.innerWidth - width - 8);
    setPos(flip ? { bottom: window.innerHeight - r.top + 4, left, width, max } : { top: r.bottom + 4, left, width, max });
  }, []);

  const openIt = () => {
    place();
    const i = Math.max(0, options.findIndex((o) => o.value === value));
    setActive(i);
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    (showSearch ? search.current : list.current)?.focus();
    const away = (e: PointerEvent) => {
      const t = e.target as Node;
      if (trigger.current?.contains(t) || list.current?.closest(".sel-layer")?.contains(t)) return;
      close(false);
    };
    const onScroll = (e: Event) => { if (!(e.target instanceof Node && list.current?.contains(e.target))) close(false); };
    document.addEventListener("pointerdown", away);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", onScroll, true);
    return () => { document.removeEventListener("pointerdown", away); window.removeEventListener("resize", place); window.removeEventListener("scroll", onScroll, true); };
  }, [open, showSearch, close, place]);

  useEffect(() => { setActive(0); }, [q]);
  useEffect(() => { if (open) list.current?.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" }); }, [active, open]);

  const pick = (v: string) => { onChange(v); close(); };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); close(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(shown.length - 1, i + 1)); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); return; }
    if (e.key === "Home" && !showSearch) { e.preventDefault(); setActive(0); return; }
    if (e.key === "End" && !showSearch) { e.preventDefault(); setActive(shown.length - 1); return; }
    if (e.key === "Enter" || (e.key === " " && !showSearch)) { e.preventDefault(); if (shown[active]) pick(shown[active].value); return; }
    if (e.key === "Tab") { close(false); return; }
    if (!showSearch && e.key.length === 1) {
      const now = Date.now();
      typed.current.s = now - typed.current.t > 600 ? e.key.toLowerCase() : typed.current.s + e.key.toLowerCase();
      typed.current.t = now;
      const hit = shown.findIndex((o) => o.label.toLowerCase().startsWith(typed.current.s));
      if (hit >= 0) setActive(hit);
    }
  };

  const onTriggerKey = (e: React.KeyboardEvent) => {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) { e.preventDefault(); openIt(); }
  };

  const listId = `${uid}-list`;
  const panel = open && (phone || pos) ? createPortal(
    <div className="sel-layer" onKeyDown={onKey}>
      {phone && <div className="sel-scrim" onPointerDown={() => close(false)} />}
      <div className={phone ? "sel-sheet" : "sel-pop"} style={phone ? undefined : { top: pos!.top, bottom: pos!.bottom, left: pos!.left, width: pos!.width, maxHeight: pos!.max }}>
        {phone && (
          <div className="sel-head">
            <span>{label}</span>
            <button type="button" className="icon-btn" onClick={() => close()} aria-label="Close"><X size={20} weight="bold" /></button>
          </div>
        )}
        {showSearch && (
          <div className="sel-search">
            <input ref={search} type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder={creatable ? "Type to search or add" : "Search"} aria-label={`Search ${label}`}
              role="combobox" aria-expanded="true" aria-controls={listId} aria-activedescendant={shown[active] ? `${uid}-o${active}` : undefined} autoComplete="off" autoCapitalize={creatable ? "characters" : "none"} />
          </div>
        )}
        <ul ref={list} id={listId} role="listbox" aria-label={label} tabIndex={-1} aria-activedescendant={shown[active] ? `${uid}-o${active}` : undefined} className="sel-list">
          {shown.length === 0 && <li className="sel-none" role="presentation">Nothing matches.</li>}
          {shown.map((o, i) => (
            <li key={o.value} id={`${uid}-o${i}`} data-i={i} role="option" aria-selected={o.value === value} className={"sel-opt" + (i === active ? " on" : "")}
              onPointerEnter={() => setActive(i)} onClick={() => pick(o.value)}>
              <span className="sel-txt">{o.label}</span>
              {o.hint && <span className="sel-hint">{o.hint}</span>}
              {o.value === value && <Check size={18} weight="bold" aria-hidden="true" />}
            </li>
          ))}
        </ul>
      </div>
    </div>, document.body) : null;

  return (
    <>
      <button ref={trigger} id={id} type="button" className={"sel" + (size === "compact" ? " compact" : "")} role="combobox" aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? listId : undefined}
        aria-label={hideLabel ? `${label}: ${text || "none"}` : undefined} onClick={() => (open ? close() : openIt())} onKeyDown={onTriggerKey}>
        <span className={"sel-val" + (text ? "" : " ph")}>{text || placeholder || "Choose"}</span>
        <CaretDown size={16} weight="bold" aria-hidden="true" />
      </button>
      {panel}
    </>
  );
}
