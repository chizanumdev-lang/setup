import Mark from "@/components/Mark";
import { HeaderActions, Tabs } from "@/components/Chrome";
import { ProfileProvider } from "@/lib/profile";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProfileProvider>
      <div className="page">
        <header className="brand">
          <Mark />
          <HeaderActions />
        </header>
        <main>{children}</main>
        <footer>Candle Three is a journaling and education tool. It does not place trades and does not give buy or sell signals.</footer>
      </div>
      <Tabs />
    </ProfileProvider>
  );
}
