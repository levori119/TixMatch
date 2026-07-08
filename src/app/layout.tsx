import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import "./globals.css";
import { BottomNav } from "./_components/bottom-nav";
import { UserMenu } from "./_components/user-menu";
import { currentUser } from "@/lib/auth";

const rubik = Rubik({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "TixMatch · סחר הוגן בכרטיסי הופעות",
  description: "First Come, First Served. בלי עוקץ, עם escrow מאובטח.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  return (
    <html lang="he" dir="rtl" className={rubik.className}>
      <body>
        <nav className="nav">
          <a href="/" className="brand">
            <span>🎟️</span>
            <span className="mark">TixMatch</span>
          </a>
          <div className="nav-links">
            <span className="nav-textlinks">
              <a href="/browse">כרטיסים</a>
              <a href="/calendar">יומן</a>
              <a href="/sell">מכירה</a>
            </span>
            <UserMenu name={user?.displayName ?? null} isAdmin={user?.role === "admin"} />
          </div>
        </nav>
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
