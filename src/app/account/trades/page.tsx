import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { listTradesForBuyer } from "@/db/escrow";
import { listBuyerDownloads } from "@/db/tickets";
import { payAction, confirmAction } from "./actions";

export const dynamic = "force-dynamic";

const stateLabel: Record<string, string> = {
  offer_accepted: "ממתין לתשלום 💳",
  funds_held: "כסף בנאמנות 🔒",
  ticket_delivered: "כרטיס נמסר — אשר קבלה ✅",
  released: "הושלם ✓",
  refunded: "הוחזר ↩",
  cancelled: "בוטל",
  disputed: "במחלוקת",
  timed_out: "פג",
};

function ils(a: number) {
  return `₪${(a / 100).toLocaleString("he-IL")}`;
}

export default async function MyTradesPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const { ok, err } = await searchParams;
  const [trades, downloads] = await Promise.all([
    listTradesForBuyer(user.id),
    listBuyerDownloads(user.id),
  ]);

  return (
    <main className="container narrow">
      <div className="page-head">
        <Link href="/account" className="crumb">← החשבון שלי</Link>
        <h1 className="page-title">העסקאות שלי 🤝</h1>
      </div>

      {ok ? <div className="notice ok">✓ הפעולה בוצעה</div> : null}
      {err ? <div className="notice err">⚠ {err}</div> : null}

      <div className="card">
        {trades.length === 0 ? (
          <p className="empty">
            אין עסקאות. <Link href="/browse">עיין בכרטיסים →</Link>
          </p>
        ) : (
          <div className="list">
            {trades.map((t) => (
              <div key={t.id} className="list-item">
                <div className="meta">
                  <span className="title">
                    {t.eventName} · {ils(t.amountAgorot)}
                  </span>
                  <span className="sub">
                    {t.venueName} · {stateLabel[t.state] ?? t.state}
                  </span>
                </div>
                {t.state === "offer_accepted" ? (
                  <form action={payAction}>
                    <input type="hidden" name="id" value={t.id} />
                    <button className="btn" type="submit">תשלום</button>
                  </form>
                ) : t.state === "ticket_delivered" ? (
                  <form action={confirmAction}>
                    <input type="hidden" name="id" value={t.id} />
                    <button className="btn" type="submit">אישור קבלה</button>
                  </form>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      {downloads.length > 0 ? (
        <div className="card">
          <p className="section-title">🎫 הכרטיסים שלי להורדה</p>
          <div className="list">
            {downloads.map((d) => (
              <div key={d.fileId} className="list-item">
                <div className="meta">
                  <span className="title">{d.eventName}</span>
                  <span className="sub">{new Date(d.startsAt).toLocaleDateString("he-IL")}</span>
                </div>
                <a href={`/api/tickets/${d.fileId}/download`} className="btn">⬇️ הורדת כרטיס</a>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <p className="hint" style={{ marginTop: 14 }}>
        🔒 התשלום מוחזק בנאמנות (escrow) ומשתחרר למוכר רק לאחר שתאשר קבלת הכרטיס.
        מנגנון הסליקה כרגע ב-<strong>sandbox</strong> לפיתוח בלבד.
      </p>
    </main>
  );
}
