import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { listUpcomingShows } from "@/db/public";
import { genresForEventIds } from "@/db/genres";
import { getAffinityMap } from "@/db/affinity";
import { coverGradient, initialOf } from "@/lib/cover";
import { FAKE_ADS } from "@/lib/fake-ads";
import { LoginForm } from "./login/login-form";

export const dynamic = "force-dynamic";

const features = [
  { ico: "🥇", title: "First Come, First Served", desc: "תור הוגן ושקוף — מי שביקש ראשון, מקבל ראשון. בלי קומבינות." },
  { ico: "🔒", title: "Escrow מאובטח", desc: "הכסף ננעל עד שהכרטיס מאומת ומתקבל. בלי לשלוח כסף לאוויר." },
  { ico: "✅", title: "אימות כרטיסים", desc: "כל כרטיס נבדק מול המקור לפני המכירה — בלי כפילויות וזיופים." },
  { ico: "⏳", title: "רשימת המתנה חכמה", desc: "אזל? נכנסים לתור Sold-Out ורואים את הסיכוי האמיתי להשיג כרטיס." },
];

function ils(a: number | null) {
  return a == null ? null : `₪${Math.round(a / 100).toLocaleString("he-IL")}`;
}

// ---------- guest landing (with inline login) ----------
function Landing() {
  return (
    <main className="container">
      <section className="landing">
        <div className="landing-hero">
          <span className="eyebrow"><span className="dot">●</span> סחר P2P בכרטיסים — בלי עמלות מנופחות</span>
          <h1>כרטיסים להופעות.<br /><span className="grad">הוגן. מאובטח. מהיר.</span></h1>
          <p className="sub">TixMatch מחברת בין קונים למוכרים עם תור הוגן ו-escrow שמבטיח שכל צד מקבל את שלו — בלי עוקץ ובלי הפתעות.</p>
        </div>
        <div className="card landing-login">
          <p className="big" style={{ marginBottom: 4 }}>כניסה 🔐</p>
          <p className="muted" style={{ fontSize: 14, marginBottom: 14 }}>שם משתמש או אימייל + סיסמה</p>
          <LoginForm />
          <p className="hint" style={{ marginTop: 14, textAlign: "center" }}>אין לך חשבון? <Link href="/register">הרשמה מהירה →</Link></p>
        </div>
      </section>
      <div className="hero-video">
        <video src="/intro.mp4" autoPlay muted loop playsInline controls preload="metadata" />
      </div>
      <section className="grid">
        {features.map((f) => (
          <div key={f.title} className="card feature">
            <div className="ico">{f.ico}</div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </section>
    </main>
  );
}

export default async function Home() {
  const user = await currentUser();
  if (!user) return <Landing />;

  // personalized "hot tickets" banners: shows with tickets, ranked by taste
  const upcoming = await listUpcomingShows();
  const eventIds = Array.from(new Set(upcoming.map((r) => r.eventId)));
  const [genresByEvent, affinity] = await Promise.all([
    genresForEventIds(eventIds),
    getAffinityMap(user.id),
  ]);
  const hot = upcoming
    .filter((r) => r.fromPriceAgorot != null && Number(r.available) > 0)
    .map((r) => {
      const g = genresByEvent.get(r.eventId) ?? [];
      const score = g.reduce((s, gg) => s + (affinity.get(gg.id) ?? 0), 0);
      return { r, score };
    })
    .sort((a, b) => b.score - a.score || new Date(a.r.startsAt).getTime() - new Date(b.r.startsAt).getTime())
    .slice(0, 8);

  return (
    <main className="container">
      <div className="greet">
        <div className="hi">היי {user.displayName.split(" ")[0]} 👋</div>
        <div className="tag">ברוך הבא ל-TixMatch · מה תרצה לעשות?</div>
      </div>

      <div className="dash-actions">
        <Link href="/sell" className="dash-cta sell"><span className="e">🎫</span><span>מכירת כרטיס</span></Link>
        <Link href="/browse" className="dash-cta buy"><span className="e">🎯</span><span>גילוי ובקשת קנייה</span></Link>
      </div>

      {/* fake ads marquee */}
      <div className="rowhead">מבצעים ופרסומות 📣</div>
      <div className="adscroll">
        <div className="adtrack">
          {[...FAKE_ADS, ...FAKE_ADS].map((a, i) => (
            <Link key={`${a.id}-${i}`} href={a.href} className="fakead" style={{ background: `linear-gradient(120deg, ${a.from}, ${a.to})` }} aria-hidden={i >= FAKE_ADS.length}>
              <span className="promo">פרסומת</span>
              <span className="fa-emoji">{a.emoji}</span>
              <span className="fa-title">{a.title}</span>
              <span className="fa-sub">{a.sub}</span>
              <span className="fa-cta">{a.cta} →</span>
            </Link>
          ))}
        </div>
      </div>

      {/* real hot-ticket banners */}
      {hot.length > 0 ? (
        <>
          <div className="rowhead" style={{ marginTop: 22 }}>כרטיסים חמים 🔥</div>
          <div className="bento">
            {hot.map(({ r }) => (
              <Link key={r.id} href={`/shows/${r.id}`} className="scard">
                <div className="cover" style={{ background: coverGradient(r.eventName) }}>
                  <span className="ini">{initialOf(r.eventName)}</span>
                </div>
                <div className="body">
                  <span className="ev">{r.eventName}</span>
                  <span className="vn">{r.venueName}{r.city ? ` · ${r.city}` : ""}</span>
                  <div className="foot">
                    <span className="from">{ils(r.fromPriceAgorot)} <small>החל מ-</small></span>
                    <span className="muted" style={{ fontSize: 12 }}>{Number(r.available)} כרט'</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      ) : null}

      <p className="hint" style={{ marginTop: 18 }}>
        לניהול מלא — כרטיסים למכירה, רכישות והיסטוריה — <Link href="/account">החשבון שלי →</Link>
      </p>
    </main>
  );
}
