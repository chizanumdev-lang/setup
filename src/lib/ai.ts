// Shared by the check route and the screens. Pure, so it can be tested without the network.
export type Verdict = "valid" | "invalid" | "unclear";

export type ProofRow = {
  id: string;
  path: string;
  item_key: string;
  url?: string;
  ai_verdict?: Verdict | null;
  ai_confidence?: number | null;
  ai_reason?: string | null;
  ai_checked_at?: string | null;
  user_verdict?: Verdict | null;
};

const VERDICTS: Verdict[] = ["valid", "invalid", "unclear"];
const isVerdict = (v: unknown): v is Verdict => typeof v === "string" && (VERDICTS as string[]).includes(v);

/** The trader's own call wins over the AI's. */
export const effective = (r: Pick<ProofRow, "ai_verdict" | "user_verdict">): Verdict | null => (isVerdict(r.user_verdict) ? r.user_verdict : isVerdict(r.ai_verdict) ? r.ai_verdict : null);

/** One verdict for a step that may have several screenshots: any valid proof is enough. */
export function stepVerdict(rows: Pick<ProofRow, "ai_verdict" | "user_verdict">[]): Verdict | null {
  const v = rows.map(effective).filter((x): x is Verdict => !!x);
  if (!v.length) return null;
  if (v.includes("valid")) return "valid";
  if (v.includes("invalid")) return "invalid";
  return "unclear";
}

export const MODEL_DEFAULT = "qwen/qwen3.8-27b";

export const SYSTEM_PROMPT = [
  "You check whether one screenshot of a trading chart supports one rule from a trader's pre-trade checklist.",
  "Judge only what is visible in the image. Do not guess hidden candles, other timeframes or anything you cannot read.",
  "Answer \"unclear\" when the timeframe, the candles or the level cannot be made out, or when the image is not a chart.",
  "Answer \"invalid\" only when you can see that the rule is not met.",
  "Do not give trading advice, predictions or signals.",
  "Reply with JSON only, in this shape: {\"verdict\":\"valid\"|\"invalid\"|\"unclear\",\"confidence\":0.0-1.0,\"reason\":\"one or two plain sentences\",\"seen\":\"timeframe and instrument if visible\"}",
].join("\n");

export function userPrompt(o: { title: string; detail?: string; bias: "bull" | "bear"; caption?: string }): string {
  return [
    `Rule: ${o.title}`,
    o.detail ? `Detail: ${o.detail}` : "",
    `The trader is looking for a ${o.bias === "bull" ? "bullish" : "bearish"} setup.`,
    o.caption ? `Caption from the trader: ${o.caption}` : "",
    "Does this screenshot show that the rule is met?",
  ].filter(Boolean).join("\n");
}

/** Read the model's reply defensively: strip thinking blocks and code fences, take the first JSON object, clamp values. */
export function parseVerdict(text: string): { verdict: Verdict; confidence: number; reason: string } | null {
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, "").replace(/```(?:json)?/gi, "");
  const start = cleaned.indexOf("{"), end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  let o: unknown;
  try { o = JSON.parse(cleaned.slice(start, end + 1)); } catch { return null; }
  const r = o as { verdict?: unknown; confidence?: unknown; reason?: unknown };
  if (!isVerdict(r.verdict)) return null;
  const c = Number(r.confidence);
  const confidence = Number.isFinite(c) ? Math.min(1, Math.max(0, c)) : 0.5;
  const reason = typeof r.reason === "string" ? r.reason.trim().slice(0, 400) : "";
  return { verdict: r.verdict, confidence, reason };
}
