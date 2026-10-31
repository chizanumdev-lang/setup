"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpenText, ChartLineUp, CircleHalf, ListChecks, Moon, Notebook, SignOut, Sun } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";

type Theme = "system" | "light" | "dark";

export function HeaderActions() {
  const [theme, setTheme] = useState<Theme>("system");
  const router = useRouter();
  useEffect(() => {
    try {
      const t = localStorage.getItem("c3-theme");
      if (t === "light" || t === "dark") setTheme(t);
    } catch {}
  }, []);
  const cycle = () => {
    const next: Theme = theme === "system" ? "light" : theme === "light" ? "dark" : "system";
    setTheme(next);
    try {
      if (next === "system") { localStorage.removeItem("c3-theme"); document.documentElement.removeAttribute("data-theme"); }
      else { localStorage.setItem("c3-theme", next); document.documentElement.setAttribute("data-theme", next); }
    } catch {}
  };
  const signOut = async () => {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  };
  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : CircleHalf;
  return (
    <div className="who">
      <button className="icon-btn" onClick={cycle} aria-label={`Theme: ${theme}. Tap to change.`}><Icon size={20} weight="bold" /></button>
      <button className="icon-btn" onClick={signOut} aria-label="Sign out"><SignOut size={20} weight="bold" /></button>
    </div>
  );
}

const TABS = [
  { href: "/", label: "Check", Icon: ListChecks },
  { href: "/log", label: "Log", Icon: Notebook },
  { href: "/stats", label: "Stats", Icon: ChartLineUp },
  { href: "/terms", label: "Terms", Icon: BookOpenText },
];

export function Tabs() {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" || path.startsWith("/log/new") : path.startsWith(href));
  return (
    <nav className="tabs" aria-label="Main" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
      {TABS.map(({ href, label, Icon }) => (
        <Link key={href} href={href} aria-current={active(href) ? "page" : undefined} style={{ textDecoration: "none" }} className="tab">
          <Icon size={22} weight="bold" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
