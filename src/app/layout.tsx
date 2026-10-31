import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Public_Sans, Spline_Sans_Mono } from "next/font/google";
import ServiceWorker from "@/components/ServiceWorker";
import "./globals.css";

const display = Barlow_Condensed({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display", display: "swap" });
const body = Public_Sans({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const mono = Spline_Sans_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "Candle Three",
  description: "Pre-trade checklist, trade journal and stats for the Daily, 4H, 15m model.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Candle Three", statusBarStyle: "default" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/icon-192.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f8f2" },
    { media: "(prefers-color-scheme: dark)", color: "#12151c" },
  ],
};

const themeInit = `try{var t=localStorage.getItem("c3-theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
