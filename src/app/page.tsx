import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForm } from "./login/login-form";

export const dynamic = "force-dynamic";

const features = [
  { ico: "🥇", title: "First Come, First Served", desc: "תור הוגן ושקוף — מי שביקש ראשון, מקבל ראשון. בלי קומבינות." },
  { ico: "🔒", title: "Escrow מאובטח", desc: "הכסף ננעל עד שהכרטיס מאומת ומתקבל. בלי לשלוח כסף לאוויר." },
  { ico: "✅", title: "אימות כרטיסים", desc: "כל כרטיס נבדק מול המקור לפני המכירה — בלי כפילויות וזיופים." },
  { ico: "⏳", title: "רשימת המתנה חכמה", desc: "אזל? נכנסים לתור Sold-Out ורואים את הסיכוי האמיתי להשיג כרטיס." },
];

export default async function Home() {
  const session = await getSession();
  if (session) redirect(session.role === "admin" ? "/admin/settings" : "/account");

  return (
    <main className="container">
      <section className="landing">
        <div className="landing-hero">
          <span className="eyebrow"><span className="dot">●</span> סחר P2P בכרטיסים — בלי עמלות מנופחות</span>
          <h1>
            כרטיסים להופעות.
            <br />
            <span className="grad">הוגן. מאובטח. מהיר.</span>
          </h1>
          <p className="sub">
            TixMatch מחברת בין קונים למוכרים עם תור הוגן ו-escrow שמבטיח שכל צד מקבל את שלו —
            בלי עוקץ ובלי הפתעות.
          </p>
        </div>

        <div className="card landing-login">
          <p className="big" style={{ marginBottom: 4 }}>כניסה 🔐</p>
          <p className="muted" style={{ fontSize: 14, marginBottom: 14 }}>שם משתמש או אימייל + סיסמה</p>
          <LoginForm />
          <p className="hint" style={{ marginTop: 14, textAlign: "center" }}>
            אין לך חשבון? <Link href="/register">הרשמה מהירה →</Link>
          </p>
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
