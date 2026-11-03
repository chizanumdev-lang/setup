import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { MODEL_DEFAULT, SYSTEM_PROMPT, parseVerdict, userPrompt } from "@/lib/ai";

const PER_HOUR = 40;            // checks per user per hour, so a bug cannot run up usage
const MAX_BYTES = 4_000_000;    // screenshots are resized on the device, so this is generous

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

/** Asks Groq's vision model whether one step screenshot supports its checklist rule. Advisory only. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return fail("Not signed in.", 401);

  const key = process.env.GROQ_API_KEY;
  if (!key) return fail("The AI check isn't set up on this server.", 503);

  let body: { imageId?: unknown; title?: unknown; detail?: unknown; bias?: unknown; caption?: unknown };
  try { body = await req.json(); } catch { return fail("Bad request.", 400); }
  const { imageId, title, detail, bias, caption } = body;
  if (typeof imageId !== "string" || typeof title !== "string" || !title.trim() || title.length > 300 || (bias !== "bull" && bias !== "bear")) return fail("Bad request.", 400);

  // the user must have switched AI features on
  const prof = await supabase.from("profiles").select("ai_enabled").eq("id", auth.user.id).maybeSingle();
  if (prof.error || !prof.data?.ai_enabled) return fail("Turn on AI features in Settings first.", 403);

  const since = new Date(Date.now() - 3_600_000).toISOString();
  const used = await supabase.from("trade_images").select("id", { count: "exact", head: true }).gte("ai_checked_at", since);
  if ((used.count ?? 0) >= PER_HOUR) return fail("That's the hourly limit for AI checks. Try again later.", 429);

  // row-level security means only the owner's screenshots can be read here
  const img = await supabase.from("trade_images").select("id,path").eq("id", imageId).maybeSingle();
  if (!img.data) return fail("Screenshot not found.", 404);
  const file = await supabase.storage.from("trade-images").download(img.data.path);
  if (file.error || !file.data) return fail("Couldn't read the screenshot.", 404);
  const buf = Buffer.from(await file.data.arrayBuffer());
  if (buf.length > MAX_BYTES) return fail("That screenshot is too large to check.", 413);

  const model = process.env.GROQ_VISION_MODEL || MODEL_DEFAULT;
  let reply: string;
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(40_000),
      body: JSON.stringify({
        model, temperature: 0, max_tokens: 500, response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: [
            { type: "text", text: userPrompt({ title: title.trim(), detail: typeof detail === "string" ? detail.slice(0, 500) : undefined, bias, caption: typeof caption === "string" ? caption.slice(0, 120) : undefined }) },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${buf.toString("base64")}` } },
          ] },
        ],
      }),
    });
    if (res.status === 429) return fail("The AI service is busy. Try again in a minute.", 429);
    if (!res.ok) return fail("The AI service couldn't check this screenshot.", 502);
    const json = await res.json();
    reply = json?.choices?.[0]?.message?.content ?? "";
  } catch {
    return fail("The AI service didn't respond. Try again.", 504);
  }

  const parsed = parseVerdict(reply);
  if (!parsed) return fail("The AI reply couldn't be read. Try again.", 502);

  const checked_at = new Date().toISOString();
  const saved = await supabase.from("trade_images").update({ ai_verdict: parsed.verdict, ai_confidence: parsed.confidence, ai_reason: parsed.reason, ai_model: model, ai_checked_at: checked_at }).eq("id", imageId);
  if (saved.error) return fail("Checked, but the result couldn't be saved.", 500);
  return NextResponse.json({ ai_verdict: parsed.verdict, ai_confidence: parsed.confidence, ai_reason: parsed.reason, ai_checked_at: checked_at });
}
