import Link from "next/link";
import { notFound } from "next/navigation";
import { getShow, getShowPool, countQueuedForShow } from "@/db/public";
import { genresForEventIds } from "@/db/genres";
import { recordShowSignal } from "@/db/affinity";
import { currentUser } from "@/lib/auth";
import { coverGradient } from "@/lib/cover";
import { isAttending, friendsAttending } from "@/db/friends";
import { BuyBox } from "./buy-box";
import { toggleAttendanceAction } from "./actions";

export const dynamic = "force-dynamic";

function ils(agorot: number | null) {
  if (agorot == null) return "—";
  return `₪${(agorot / 100).toLocaleString("he-IL")}`;
}

export default async function ShowDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const showId = Number(id);
  if (!Number.isInteger(showId)) notFound();

  const show = await getShow(showId);
  if (!show) notFound();

  const [pool, interested, user] = await Promise.all([
    getShowPool(showId),
    countQueuedForShow(showId),
    currentUser(),
  ]);

  const genresByEvent = await genresForEventIds([show.eventId]);
  const showGenres = genresByEvent.get(show.eventId) ?? [];

  // record a taste signal (a view) for logged-in users
  if (user) await recordShowSignal(user.id, showId, 1);

  const [going, friendsHere] = user
    ? await Promise.all([isAttending(user.id, showId), friendsAttending(user.id, showId)])
    : [false, [] as { id: number; name: string }[]];

  const fromPrice = pool.fromPriceAgorot != null ? ils(pool.fromPriceAgorot) : "";
  const when = new Date(show.startsAt);

  return (
    <main className="container narrow">
      <Link href="/browse" className="crumb" style={{ display: "inline-block", marginTop: 8 }}>
        ← חזרה לגילוי
      </Link>

      <div className="show-hero" style={{ background: coverGradient(show.eventName) }}>
        <div className="cap">
          <h1>{show.eventName}</h1>
          <div className="meta-row">
            {show.artist ? <span className="metachip">🎤 {show.artist}</span> : null}
            <span className="metachip">📍 {show.venueName}{show.city ? `, ${show.city}` : ""}</span>
            <span className="metachip">
              📅 {when.toLocaleDateString("he-IL", { day: "numeric", month: "long" })} ·{" "}
              {when.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
            </span>
            {showGenres.map((g) => (
              <span key={g.slug} className="metachip">{g.emoji} {g.nameHe}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <p className="section-title">כרטיסים</p>
        {pool.available > 0 ? (
          <>
            <div className="pool">
              <div className="pool-price">
                <span className="lbl">החל מ-</span>
                <span className="num">{fromPrice}</span>
                <span className="lbl">לכרטיס</span>
              </div>
              <div className="pool-avail">🎟️ {pool.available} כרטיסים במאגר</div>
            </div>
            <p className="hint" style={{ marginTop: 10 }}>
              💡 המערכת מחלקת את הכרטיסים אוטומטית לפי התור (First-Come-First-Served) והמחיר
              הזול ביותר שתואם. <strong>המחיר עשוי לרדת בהמשך</strong> אם כרטיסים לא יימכרו.
            </p>
            {interested > 0 ? (
              <div className="warnbar" style={{ marginTop: 12 }}>
                👀 {interested} {interested === 1 ? "קונה מתעניין" : "קונים מתעניינים"} כרגע.
                רק הראשון שמשלים רכישה זוכה — <strong>ייתכן שהמחיר יעלה</strong> עד לסיום הרכישה.
              </div>
            ) : null}
          </>
        ) : (
          <p className="empty">
            אין כרגע כרטיסים במאגר. הצטרף לתור — נשריין לך אוטומטית כשיתווסף כרטיס תואם.
          </p>
        )}
      </div>

      <div className="card">
        {user ? (
          <BuyBox showId={showId} fromPrice={fromPrice} interested={interested} />
        ) : (
          <>
            <p className="section-title">רוצה לקנות?</p>
            <p className="muted" style={{ marginBottom: 14 }}>
              התחבר או הירשם כדי לשלוח בקשת קנייה ולהיכנס לתור ההוגן.
            </p>
            <div className="cta-row" style={{ justifyContent: "flex-start" }}>
              <Link href="/login" className="btn">כניסה</Link>
              <Link href="/register" className="btn ghost">הרשמה</Link>
            </div>
          </>
        )}
      </div>

      {user ? (
        <div className="card">
          <div className="dash-head">
            <p className="section-title" style={{ margin: 0 }}>👥 FriendMatch</p>
            <form action={toggleAttendanceAction}>
              <input type="hidden" name="showId" value={showId} />
              <input type="hidden" name="going" value={going ? "0" : "1"} />
              <button type="submit" className={going ? "chip active" : "btn"}>
                {going ? "✓ אני מגיע (בטל)" : "🙋 אני מגיע"}
              </button>
            </form>
          </div>
          {friendsHere.length > 0 ? (
            <p style={{ marginTop: 10 }}>
              🎉 חברים שמגיעים: <strong>{friendsHere.map((f) => f.name).join(", ")}</strong>
            </p>
          ) : (
            <p className="muted" style={{ marginTop: 10 }}>
              אף אחד מהחברים שלך לא סימן שהוא מגיע. <Link href="/friends">נהל חברים →</Link>
            </p>
          )}
          <p className="hint" style={{ marginTop: 8 }}>
            סימון "אני מגיע" גלוי רק לחברים שהוספת ב-<Link href="/friends">FriendMatch</Link>.
          </p>
        </div>
      ) : null}
    </main>
  );
}
