"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Trade } from "@/lib/format";
import TradeForm from "@/components/TradeForm";

export default function EditTrade({ id }: { id: string }) {
  const [t, setT] = useState<Trade | null | undefined>(undefined);
  useEffect(() => { createClient().from("trades").select("*").eq("id", id).maybeSingle().then(({ data }) => setT((data as Trade) ?? null)); }, [id]);
  if (t === undefined) return <section className="view"><div className="skel" /><div className="skel" /></section>;
  if (t === null) return <section className="view"><h1>Not found</h1><p className="lede">This trade doesn&apos;t exist or isn&apos;t yours.</p></section>;
  return <TradeForm trade={t} />;
}
