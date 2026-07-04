const features = [
  {
    ico: "🥇",
    title: "First Come, First Served",
    desc: "תור הוגן ושקוף — מי שביקש ראשון, מקבל ראשון. בלי קומבינות.",
  },
  {
    ico: "🔒",
    title: "Escrow מאובטח",
    desc: "הכסף ננעל עד שהכרטיס מאומת ומתקבל. בלי לשלוח כסף לאוויר.",
  },
  {
    ico: "✅",
    title: "אימות כרטיסים",
    desc: "כל כרטיס נבדק מול המקור לפני המכירה — בלי כפילויות וזיופים.",
  },
  {
    ico: "⏳",
    title: "רשימת המתנה חכמה",
    desc: "אזל? נכנסים לתור Sold-Out ורואים את הסיכוי האמיתי להשיג כרטיס.",
  },
];

export default function Home() {
  return (
    <main className="container">
      <section className="hero">
        <span className="eyebrow">
          <span className="dot">●</span> סחר P2P בכרטיסים — בלי עמלות מנופחות
        </span>
        <h1>
          כרטיסים להופעות.
          <br />
          <span className="grad">הוגן. מאובטח. מהיר.</span>
        </h1>
        <p className="sub">
          TixMatch מחברת בין קונים למוכרים עם תור הוגן ו-escrow שמבטיח שכל צד מקבל
          את שלו — בלי עוקץ ובלי הפתעות.
        </p>
        <div className="cta-row">
          <a href="/browse" className="btn">
            עיון בכרטיסים 🎟️
          </a>
          <a href="#how" className="btn ghost">
            איך זה עובד?
          </a>
        </div>

        <div className="hero-video">
          <video
            src="/intro.mp4"
            autoPlay
            muted
            loop
            playsInline
            controls
            preload="metadata"
          />
        </div>
      </section>

      <section id="how" className="grid">
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
