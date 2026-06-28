import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import "./globals.css";

const rubik = Rubik({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "TixMix · סחר הוגן בכרטיסי הופעות",
  description: "First Come, First Served. בלי עוקץ, עם escrow מאובטח.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl" className={rubik.className}>
      <body>
        <nav className="nav">
          <a href="/" className="brand">
            <span>🎟️</span>
            <span className="mark">TixMix</span>
          </a>
          <div className="nav-links">
            <a href="/">בית</a>
            <a href="/browse">כרטיסים</a>
            <a href="/admin/settings">ניהול</a>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
