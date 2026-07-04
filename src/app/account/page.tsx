import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { topGenres } from "@/db/affinity";
import { logoutToHomeAction } from "../auth-actions";

export const dynamic = "force-dynamic";

const spotifyMsg: Record<string, { ok: boolean; text: string }> = {
  ok: { ok: true, text: "🎧 ייבאנו את הטעם המוזיקלי שלך מספוטיפיי! גלה המלצות מותאמות." },
  empty: { ok: true, text: "התחברת לספוטיפיי, אך לא זוהו סגנונות תואמים." },
  denied: { ok: false, text: "החיבור לספוטיפיי בוטל." },
  state: { ok: false, text: "החיבור לספוטיפיי נכשל (אימות). נסה שוב." },
  error: { ok: false, text: "אירעה שגיאה בחיבור לספוטיפיי." },
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ spotify?: string }>;
}) {
  const user = await currentUser();
  const { spotify } = await searchParams;
  const spMsg = spotify ? spotifyMsg[spotify] : null;
  const taste = user ? await topGenres(user.id, 30) : [];
  const maxScore = taste.reduce((m, t) => Math.max(m, t.score), 1);

  if (!user) {
    return (
      <main className="container narrow">
        <div className="page-head">
          <span className="crumb">TixMatch</span>
          <h1 className="page-title">החשבון שלי 👤</h1>
        </div>
        <div className="card">
          <p className="empty">אינך מחובר.</p>
          <div className="cta-row" style={{ justifyContent: "flex-start" }}>
            <Link href="/login" className="btn">כניסה</Link>
            <Link href="/register" className="btn ghost">הרשמה</Link>
          </div>
        </div>
      </main>
    );
  }

  const tiles = [
    { href: "/browse", te: "🎟️", tt: "גלה כרטיסים", ts: "מצא הופעות" },
    { href: "/sell", te: "➕", tt: "מכירת כרטיס", ts: "פרסם למכירה" },
    { href: "/account/payment", te: "💳", tt: "אמצעי תשלום", ts: "כרטיס ואימות" },
    { href: "/account/listings", te: "📋", tt: "הכרטיסים שלי", ts: "ההיצע שלך" },
    { href: "/account/requests", te: "🎯", tt: "הבקשות שלי", ts: "בתור לקנייה" },
    { href: "/account/trades", te: "🤝", tt: "עסקאות קנייה", ts: "תשלום ואישור" },
    { href: "/account/sales", te: "💰", tt: "המכירות שלי", ts: "מסירת כרטיס" },
  ];

  return (
    <main className="container">
      <div className="greet">
        <div className="hi">היי {user.displayName.split(" ")[0]} 👋</div>
        <div className="tag">
          {user.email} · {user.role === "admin" ? "מנהל 🛡️" : "חשבון לקוח"}
        </div>
      </div>

      {spMsg ? (
        <div className={`notice ${spMsg.ok ? "ok" : "err"}`} role="status">
          {spMsg.ok ? "✓" : "⚠"} {spMsg.text}
        </div>
      ) : null}

      <div className="card" style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <p className="section-title" style={{ margin: 0 }}>🎵 הטעם המוזיקלי שלי</p>
          <a href="/api/spotify/login" className="chip" style={{ background: "linear-gradient(90deg,#1db954,#1ed760)", borderColor: "transparent", color: "#04220f" }}>
            🎧 {taste.length > 0 ? "רענן מספוטיפיי" : "חבר ספוטיפיי"}
          </a>
        </div>
        {taste.length === 0 ? (
          <p className="empty" style={{ marginTop: 12 }}>
            עדיין אין פרופיל טעם. חבר ספוטיפיי או פשוט עיין בהופעות — ונלמד מה אתה אוהב.
          </p>
        ) : (
          <div className="taste" style={{ marginTop: 12 }}>
            {taste.map((g) => (
              <div key={g.slug} className="tasterow">
                <span className="tastelabel">{g.emoji} {g.nameHe}</span>
                <span className="tastebar"><span style={{ width: `${Math.round((g.score / maxScore) * 100)}%` }} /></span>
                <span className="tastescore">{g.score}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="tiles">
        {tiles.map((t) => (
          <Link key={t.href} href={t.href} className="tile">
            <span className="te">{t.te}</span>
            <span className="tt">{t.tt}</span>
            <span className="ts">{t.ts}</span>
          </Link>
        ))}
        {user.role === "admin" ? (
          <Link href="/admin/settings" className="tile">
            <span className="te">🛡️</span>
            <span className="tt">מסך ניהול</span>
            <span className="ts">אדמין</span>
          </Link>
        ) : null}
      </div>

      <form action={logoutToHomeAction} style={{ marginTop: 18 }}>
        <button type="submit" className="btn ghost">יציאה מהחשבון</button>
      </form>
    </main>
  );
}
