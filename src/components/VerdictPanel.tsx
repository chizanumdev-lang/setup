"use client";
import Link from "next/link";
import { Check, Question, Robot, X } from "@phosphor-icons/react";
import { effective, type ProofRow, type Verdict } from "@/lib/ai";

const LABEL: Record<Verdict, string> = { valid: "Valid", invalid: "Not valid", unclear: "Unclear" };

/** Verdict with an icon and a word, never colour alone. */
export function VerdictPill({ v, small }: { v: Verdict | null; small?: boolean }) {
  const Icon = v === "valid" ? Check : v === "invalid" ? X : Question;
  return (
    <span className={"vp " + (v ?? "none") + (small ? " sm" : "")}>
      <Icon size={small ? 12 : 14} weight="bold" aria-hidden="true" />{v ? LABEL[v] : "Unchecked"}
    </span>
  );
}

/** Small status mark on a thumbnail. */
export function VerdictMark({ row }: { row: Pick<ProofRow, "ai_verdict" | "user_verdict"> }) {
  const v = effective(row);
  if (!v) return null;
  const Icon = v === "valid" ? Check : v === "invalid" ? X : Question;
  return <span className={"vm " + v} role="img" aria-label={LABEL[v]}><Icon size={12} weight="bold" aria-hidden="true" /></span>;
}

/** What the AI said about a screenshot, with the trader's own call on top. */
export default function VerdictPanel({ row, aiEnabled, busy, error, onCheck, onOverride }: {
  row: ProofRow; aiEnabled: boolean; busy: boolean; error?: string; onCheck: () => void; onOverride: (v: Verdict | null) => void;
}) {
  const v = effective(row);
  const mine = row.user_verdict ?? null;
  return (
    <div className="vpanel">
      <div className="vrow">
        <VerdictPill v={v} />
        {row.ai_verdict && !mine && row.ai_confidence != null && <span className="mono vconf">{Math.round(row.ai_confidence * 100)}% sure</span>}
        {mine && <span className="vconf">Your call</span>}
        {!mine && row.ai_verdict && <span className="vconf"><Robot size={14} weight="bold" aria-hidden="true" /> AI check</span>}
      </div>
      {row.ai_reason && <p className="vreason">{row.ai_reason}</p>}
      {mine && row.ai_verdict && <p className="vreason">The AI said {LABEL[row.ai_verdict].toLowerCase()}. Your call is the one that counts.</p>}
      {error && <p className="msg err" role="alert">{error}</p>}
      {aiEnabled ? (
        <button className="btn ghost" style={{ minHeight: 44, fontSize: 16 }} onClick={onCheck} disabled={busy}>
          <Robot size={20} weight="bold" />{busy ? "Checking" : row.ai_verdict ? "Check again" : "Check with AI"}
        </button>
      ) : (
        <p className="vreason">AI checks are off. <Link href="/settings">Turn them on in Settings</Link>. You can still mark it yourself.</p>
      )}
      <div className="f" style={{ marginBottom: 0 }}>
        <span className="l">Your call</span>
        <div className="seg plain" role="group" aria-label="Your verdict">
          {(["valid", "invalid", "unclear"] as Verdict[]).map((x) => (
            <button key={x} aria-pressed={mine === x} onClick={() => onOverride(mine === x ? null : x)}>{LABEL[x]}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
