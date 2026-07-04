import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { topGenres } from "@/db/affinity";
import { listListingsForSeller } from "@/db/listings";
import { listTradesForBuyer } from "@/db/escrow";
import { logoutToHomeAction } from "../auth-actions";
import { payAction, confirmAction } from "./trades/actions";

export const dynamic = "force-dynamic";

function ils(a: number | null) {
  return a == null ? "—" : `₪${(a / 100).toLocaleString("he-IL")}`;
}
function dt(d: Date | string) {
  return new Date(d).toLocaleDateString("he-IL");
}

const spotifyMsg: Record<string, { ok: boolean; text: string }> = {
  ok: { ok: true, text: "🎧 ייבאנו את הטעם המוזיקלי שלך מספוטיפיי! גלה המלצות מותאמות." },
  empty: { ok: true, text: "התחברת לספוטיפיי, אך לא זוהו סגנונות תואמים." },
  denied: { ok: false, text: "החיבור לספוטיפיי בוטל." },
  state: { ok: false, text: "החיבור לספוטיפיי נכשל (אימות). נסה שוב." },
  error: { ok: false, text: "אירעה שגיאה בחיבור לספוטיפיי." },
};

const buyState: Record<string, string> = {
  offer_accepted: "ממתין לתשלום 💳",
  funds_held: "שולם — ממתין למסירה 🔒",
  ticket_delivered: "נמסר — אשר קבלה ✅",
  released: "הושלם ✓",
  refunded: "הוחזר ↩",
  cancelled: "בוטל",
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ spotify?: string }>;
}) {
  const user = await currentUser();
  const { spotify } = await searchParams;
  const spMsg = spotify ? spotifyMsg[spotify] : null;

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

  const [listings, buys, taste] = await Promise.all([
    listListingsForSeller(user.id),
    listTradesForBuyer(user.id),
    topGenres(user.id, 20),
  ]);

  const forSale = listings.filter((l) => l.status === "active");
  const activeBuys = buys.filter((t) => ["offer_accepted", "funds_held", "ticket_delivered"].includes(t.state));
  const historyBuys = buys.filter((t) => t.state === "released");
  const maxScore = taste.reduce((m, t) => Math.max(m, t.score), 1);

  return (
    <main className="container">
      <div className="greet">
        <div className="hi">היי {user.displayName.split(" ")[0]} 👋</div>
        <div className="tag">{user.email} · {user.role === "admin" ? "מנהל 🛡️" : "חשבון לקוח"}</div>
      </div>

      {spMsg ? <div className={`notice ${spMsg.ok ? "ok" : "err"}`} role="status">{spMsg.ok ? "✓" : "⚠"} {spMsg.text}</div> : null}

      {/* primary actions */}
      <div className="dash-actions">
        <Link href="/sell" className="dash-cta sell"><span className="e">🎫</span><span>מכירת כרטיס</span></Link>
        <Link href="/browse" className="dash-cta buy"><span className="e">🎯</span><span>גילוי ובקשת קנייה</span></Link>
      </div>

      {/* my tickets for sale */}
      <div className="card">
        <div className="dash-head">
          <p className="section-title" style={{ margin: 0 }}>🎫 הכרטיסים שלי למכירה ({forSale.length})</p>
          <Link href="/account/listings" className="chip">ניהול</Link>
        </div>
        {forSale.length === 0 ? (
          <p className="empty">אין לך כרטיסים למכירה. <Link href="/sell">פרסם כרטיס →</Link></p>
        ) : (
          <div className="list">
            {forSale.map((l) => (
              <div key={l.id} className="list-item">
                <div className="meta">
                  <span className="title">{l.eventName} — {ils(l.basePriceAgorot)}</span>
                  <span className="sub">{l.venueName} · {dt(l.startsAt)} · {l.quantityAvailable}/{l.quantityTotal} זמינים</span>
                </div>
                <span className="chip" style={{ pointerEvents: "none" }}>למכירה</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* active purchases (actionable) */}
      <div className="card">
        <div className="dash-head">
          <p className="section-title" style={{ margin: 0 }}>🛒 רכישות פעילות ({activeBuys.length})</p>
          <Link href="/account/trades" className="chip">כל העסקאות</Link>
        </div>
        {activeBuys.length === 0 ? (
          <p className="empty">אין רכישות פעילות.</p>
        ) : (
          <div className="list">
            {activeBuys.map((t) => (
              <div key={t.id} className="list-item">
                <div className="meta">
                  <span className="title">{t.eventName} — {ils(t.amountAgorot)}</span>
                  <span className="sub">{t.venueName} · {buyState[t.state] ?? t.state}</span>
                </div>
                {t.state === "offer_accepted" ? (
                  <form action={payAction}><input type="hidden" name="id" value={t.id} /><button className="btn" type="submit">תשלום</button></form>
                ) : t.state === "ticket_delivered" ? (
                  <form action={confirmAction}><input type="hidden" name="id" value={t.id} /><button className="btn" type="submit">אישור קבלה</button></form>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* purchase history */}
      <div className="card">
        <p className="section-title">📜 היסטוריית רכישות ({historyBuys.length})</p>
        {historyBuys.length === 0 ? (
          <p className="empty">עדיין אין רכישות שהושלמו.</p>
        ) : (
          <div className="list">
            {historyBuys.map((t) => (
              <div key={t.id} className="list-item">
                <div className="meta">
                  <span className="title">{t.eventName} — {ils(t.amountAgorot)}</span>
                  <span className="sub">{t.venueName} · {dt(t.startsAt)} · שולם ✓</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* taste + secondary links */}
      <div className="card">
        <div className="dash-head">
          <p className="section-title" style={{ margin: 0 }}>🎵 הטעם המוזיקלי שלי</p>
          <a href="/api/spotify/login" className="chip" style={{ background: "linear-gradient(90deg,#1db954,#1ed760)", borderColor: "transparent", color: "#04220f" }}>
            🎧 {taste.length > 0 ? "רענן" : "חבר ספוטיפיי"}
          </a>
        </div>
        {taste.length === 0 ? (
          <p className="empty">חבר ספוטיפיי או עיין בהופעות — ונלמד מה אתה אוהב.</p>
        ) : (
          <div className="taste">
            {taste.slice(0, 8).map((g) => (
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
        <Link href="/account/payment" className="tile"><span className="te">💳</span><span className="tt">אמצעי תשלום</span><span className="ts">כרטיס ואימות</span></Link>
        <Link href="/account/requests" className="tile"><span className="te">🎯</span><span className="tt">הבקשות שלי</span><span className="ts">בתור לקנייה</span></Link>
        <Link href="/account/sales" className="tile"><span className="te">💰</span><span className="tt">המכירות שלי</span><span className="ts">מסירת כרטיס</span></Link>
        {user.role === "admin" ? (
          <Link href="/admin/settings" className="tile"><span className="te">🛡️</span><span className="tt">מסך ניהול</span><span className="ts">אדמין</span></Link>
        ) : null}
      </div>

      <form action={logoutToHomeAction} style={{ marginTop: 18 }}>
        <button type="submit" className="btn ghost">יציאה מהחשבון</button>
      </form>
    </main>
  );
}
