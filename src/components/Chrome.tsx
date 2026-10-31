"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpenText, ChartLineUp, CircleHalf, GearSix, ListChecks, Moon, Notebook, SignOut, Sun } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/lib/profile";

export function HeaderActions() {
  const { profile, update } = useProfile();
  const router = useRouter();
  const theme = profile.theme;
  const cycle = () => { void update({ theme: theme === "system" ? "light" : theme === "light" ? "dark" : "system" }); };
  const signOut = async () => {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  };
  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : CircleHalf;
  return (
    <div className="who">
      <button className="icon-btn" onClick={cycle} aria-label={`Theme: ${theme}. Tap to change.`}><Icon size={20} weight="bold" /></button>
      <Link href="/settings" className="icon-btn" aria-label="Settings"><GearSix size={20} weight="bold" /></Link>
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
  const active = (href: string) => (href === "/" ? path === "/" || path.startsWith("/log/new") || path.startsWith("/strategies") || path.startsWith("/settings") : path.startsWith(href));
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
