import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getMyPhone, listFriends, friendsUpcoming } from "@/db/friends";
import { PhoneForm, AddFriendForm } from "./friend-forms";
import { removeFriendAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function FriendsPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const [phone, friends, upcoming] = await Promise.all([
    getMyPhone(user.id),
    listFriends(user.id),
    friendsUpcoming(user.id),
  ]);

  // group upcoming shows -> friend names
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
        <p className="muted">מצא חברים שמגיעים לאותן הופעות — לפי מספר טלפון.</p>
      </div>

      <div className="card"><PhoneForm current={phone} /></div>
      <div className="card"><AddFriendForm /></div>

      <div className="card">
        <p className="section-title">החברים שלי ({friends.length})</p>
        {friends.length === 0 ? (
          <p className="empty">עדיין אין חברים. הוסף לפי מספר טלפון ☝️</p>
        ) : (
          <div className="list">
            {friends.map((f) => (
              <div key={f.id} className="list-item">
                <div className="meta"><span className="title">{f.name}</span></div>
                <form action={removeFriendAction}>
                  <input type="hidden" name="friendId" value={f.id} />
                  <button type="submit" className="chip danger">הסרה</button>
                </form>
              </div>
            ))}
          </div>
        )}
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
                  <span className="sub">
                    {s.venueName} · {new Date(s.startsAt).toLocaleDateString("he-IL")} · 🙋 {s.names.join(", ")}
                  </span>
                </div>
                <span className="chip">פרטים →</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <p className="hint" style={{ marginTop: 12 }}>
        🔒 פרטיות: אתה רואה רק חברים שהוספת בעצמך, ורק אם הם סימנו "אני מגיע". הכל opt-in.
      </p>
    </main>
  );
}
