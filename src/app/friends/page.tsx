import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import {
  getMyPhone, listFriends, friendsUpcoming, incomingRequests, outgoingRequests, getOptOut,
} from "@/db/friends";
import { PhoneForm, AddFriendForm } from "./friend-forms";
import { acceptRequestAction, removeFriendAction, setOptOutAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function FriendsPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const [phone, friends, upcoming, incoming, outgoing, optOut] = await Promise.all([
    getMyPhone(user.id),
    listFriends(user.id),
    friendsUpcoming(user.id),
    incomingRequests(user.id),
    outgoingRequests(user.id),
    getOptOut(user.id),
  ]);

  const byShow = new Map<number, { eventName: string; venueName: string; startsAt: Date; names: string[] }>();
  for (const r of upcoming) {
    const e = byShow.get(r.showId) ?? { eventName: r.eventName, venueName: r.venueName, startsAt: r.startsAt, names: [] };
    e.names.push(r.friendName);
    byShow.set(r.showId, e);
  }
  const shows = Array.from(byShow.entries());

  return (
    <main className="container narrow">
      <div className="page-head">
        <span className="crumb">TixMatch</span>
        <h1 className="page-title">FriendMatch 👥</h1>
        <p className="muted">חברים הדדיים (בהסכמה) שמגיעים לאותן הופעות — לפי מספר טלפון.</p>
      </div>

      {/* privacy */}
      <div className="card">
        <div className="dash-head">
          <p className="section-title" style={{ margin: 0 }}>🔒 פרטיות</p>
          <form action={setOptOutAction}>
            <input type="hidden" name="optout" value={optOut ? "0" : "1"} />
            <button type="submit" className={optOut ? "btn" : "chip active"}>
              {optOut ? "אני מוסתר — הפעל נראות" : "✓ נראה לחברים — הסתר אותי"}
            </button>
          </form>
        </div>
        <p className="hint" style={{ marginTop: 8 }}>
          {optOut
            ? "כרגע אתה מוסתר: אף חבר לא רואה שאתה מגיע להופעות, בשום אירוע."
            : "חברים שאישרת רואים שאתה מגיע (רק אם סימנת \"אני מגיע\"). אפשר להסתיר לגמרי בכל רגע."}
        </p>
      </div>

      <div className="card"><PhoneForm current={phone} /></div>
      <div className="card"><AddFriendForm /></div>

      {incoming.length > 0 ? (
        <div className="card">
          <p className="section-title">בקשות חברות אליך ({incoming.length})</p>
          <div className="list">
            {incoming.map((f) => (
              <div key={f.id} className="list-item">
                <div className="meta"><span className="title">{f.name}</span><span className="sub">שלח/ה לך בקשת חברות</span></div>
                <div style={{ display: "flex", gap: 8 }}>
                  <form action={acceptRequestAction}><input type="hidden" name="userId" value={f.id} /><button className="btn" type="submit">אישור</button></form>
                  <form action={removeFriendAction}><input type="hidden" name="userId" value={f.id} /><button className="chip danger" type="submit">דחייה</button></form>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="card">
        <p className="section-title">החברים שלי ({friends.length})</p>
        {friends.length === 0 ? (
          <p className="empty">עדיין אין חברים. שלח בקשה לפי מספר טלפון ☝️</p>
        ) : (
          <div className="list">
            {friends.map((f) => (
              <div key={f.id} className="list-item">
                <div className="meta"><span className="title">{f.name}</span></div>
                <form action={removeFriendAction}><input type="hidden" name="userId" value={f.id} /><button type="submit" className="chip danger">הסרה</button></form>
              </div>
            ))}
          </div>
        )}
        {outgoing.length > 0 ? (
          <p className="hint" style={{ marginTop: 10 }}>
            ⏳ בקשות שנשלחו וממתינות: {outgoing.map((o) => o.name).join(", ")}
          </p>
        ) : null}
      </div>

      <div className="card">
        <p className="section-title">חברים מגיעים 🎉 ({shows.length})</p>
        {shows.length === 0 ? (
          <p className="empty">אף חבר לא סימן שהוא מגיע להופעה עדיין.</p>
        ) : (
          <div className="list">
            {shows.map(([showId, s]) => (
              <Link key={showId} href={`/shows/${showId}`} className="list-item" style={{ textDecoration: "none", color: "inherit" }}>
                <div className="meta">
                  <span className="title">{s.eventName}</span>
                  <span className="sub">{s.venueName} · {new Date(s.startsAt).toLocaleDateString("he-IL")} · 🙋 {s.names.join(", ")}</span>
                </div>
                <span className="chip">פרטים →</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
