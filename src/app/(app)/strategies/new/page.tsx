"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import StrategyEditor from "@/components/StrategyEditor";

function Inner() {
  const from = useSearchParams().get("from");
  return <StrategyEditor from={from ?? undefined} />;
}

export default function Page() {
  return <Suspense><Inner /></Suspense>;
}
