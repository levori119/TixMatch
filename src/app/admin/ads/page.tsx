import { listAllAds } from "@/db/ads";
import { AdForm } from "./ad-form";
import { toggleAdAction, deleteAdAction } from "./actions";

export const dynamic = "force-dynamic";

function windowLabel(startsAt: Date | null, endsAt: Date | null) {
  const f = (d: Date) => new Date(d).toLocaleDateString("he-IL");
  if (!startsAt && !endsAt) return "תמיד";
  if (startsAt && endsAt) return `${f(startsAt)} – ${f(endsAt)}`;
  if (startsAt) return `מ-${f(startsAt)}`;
  return `עד ${f(endsAt!)}`;
}

function isLive(a: { active: boolean; startsAt: Date | null; endsAt: Date | null }) {
  if (!a.active) return false;
  const now = Date.now();
  if (a.startsAt && new Date(a.startsAt).getTime() > now) return false;
  if (a.endsAt && new Date(a.endsAt).getTime() < now) return false;
  return true;
}

export default async function AdminAdsPage() {
  const rows = await listAllAds();
  const liveCount = rows.filter(isLive).length;

  return (
    <main className="container narrow">
      <div className="page-head">
        <span className="crumb">ניהול / פרסומות</span>
        <h1 className="page-title">פרסומות 📣</h1>
        <p className="muted">מוצגות בפס השמאלי בכל המסכים. {liveCount} מוצגות כרגע.</p>
      </div>

      <div className="card"><AdForm /></div>

      <div className="card">
        <p className="section-title">כל הפרסומות ({rows.length})</p>
        {rows.length === 0 ? (
          <p className="empty">אין פרסומות. עד שתוסיף — מוצגות פרסומות ברירת מחדל.</p>
        ) : (
          <div className="list">
            {rows.map((a) => (
              <div key={a.id} className="list-item">
                <div className="meta">
                  <span className="title">
                    {a.emoji} {a.title} {isLive(a) ? "🟢" : "⚪"}
                  </span>
                  <span className="sub">
                    {a.subtitle ? `${a.subtitle} · ` : ""}{windowLabel(a.startsAt, a.endsAt)} · סדר {a.sortOrder} · {a.href}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <form action={toggleAdAction}>
                    <input type="hidden" name="id" value={a.id} />
                    <input type="hidden" name="active" value={a.active ? "0" : "1"} />
                    <button type="submit" className="chip">{a.active ? "כיבוי" : "הפעלה"}</button>
                  </form>
                  <form action={deleteAdAction}>
                    <input type="hidden" name="id" value={a.id} />
                    <button type="submit" className="chip danger">מחיקה</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="hint" style={{ marginTop: 12 }}>
        🟢 = מוצגת עכשיו (פעילה ובתוך חלון התאריכים). אם אין אף פרסומת פעילה — מוצגות ברירות המחדל.
      </p>
    </main>
  );
}
