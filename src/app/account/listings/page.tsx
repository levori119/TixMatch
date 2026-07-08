import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { listListingsForSeller } from "@/db/listings";
import { listTicketFilesForListing } from "@/db/tickets";
import { cancelListingAction, uploadTicketAction } from "./actions";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  active: "פעיל",
  reserved: "משוריין",
  sold: "נמכר ✓",
  cancelled: "בוטל",
};
const tkMsg: Record<string, { ok: boolean; text: string }> = {
  ok: { ok: true, text: "הכרטיס הועלה ונרשם ✓" },
  missing: { ok: false, text: "לא נבחר קובץ." },
  toobig: { ok: false, text: "הקובץ גדול מדי (מקס' 6MB)." },
  owner: { ok: false, text: "הכרטיס לא שייך לך." },
  error: { ok: false, text: "העלאה נכשלה." },
};

function ils(a: number | null) {
  return a == null ? "—" : `₪${(a / 100).toLocaleString("he-IL")}`;
}

export default async function MyListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tk?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const { tk } = await searchParams;
  const msg = tk ? tkMsg[tk] : null;

  const rows = await listListingsForSeller(user.id);
  const filesByListing = new Map<number, Awaited<ReturnType<typeof listTicketFilesForListing>>>();
  await Promise.all(rows.map(async (r) => filesByListing.set(r.id, await listTicketFilesForListing(r.id))));

  return (
    <main className="container narrow">
      <div className="page-head">
        <Link href="/account" className="crumb">← החשבון שלי</Link>
        <h1 className="page-title">הכרטיסים שלי 🎫</h1>
      </div>

      {msg ? <div className={`notice ${msg.ok ? "ok" : "err"}`} role="status">{msg.ok ? "✓" : "⚠"} {msg.text}</div> : null}

      <div className="cta-row" style={{ justifyContent: "flex-start", marginBottom: 8 }}>
        <Link href="/sell" className="btn">➕ מכירת כרטיס חדש</Link>
      </div>

      {rows.length === 0 ? (
        <div className="card"><p className="empty">עדיין לא פרסמת כרטיסים. <Link href="/sell">מכור את הראשון →</Link></p></div>
      ) : (
        rows.map((r) => {
          const files = filesByListing.get(r.id) ?? [];
          return (
            <div key={r.id} className="card">
              <div className="list-item" style={{ padding: 0, border: "none" }}>
                <div className="meta">
                  <span className="title">{r.eventName} — {ils(r.basePriceAgorot)} לכרטיס</span>
                  <span className="sub">
                    {r.venueName} · {new Date(r.startsAt).toLocaleDateString("he-IL")} ·{" "}
                    {r.quantityAvailable}/{r.quantityTotal} זמינים · {statusLabel[r.status] ?? r.status}
                  </span>
                  {r.seatKind ? (
                    <span className="sub" style={{ marginTop: 2 }}>
                      {r.seatKind === "seated" ? "🪑 ישיבה" : "🧍 עמידה"}
                      {r.seatSection ? ` · אזור ${r.seatSection}` : ""}
                      {r.seatRow ? ` · שורה ${r.seatRow}` : ""}
                      {r.seatNumber ? ` · כיסא ${r.seatNumber}` : ""}
                    </span>
                  ) : null}
                </div>
                {r.status === "active" ? (
                  <form action={cancelListingAction}>
                    <input type="hidden" name="id" value={r.id} />
                    <button type="submit" className="chip danger">ביטול מכירה</button>
                  </form>
                ) : null}
              </div>

              {/* uploaded tickets + barcode status */}
              {files.length > 0 ? (
                <div className="list" style={{ marginTop: 12 }}>
                  {files.map((f) => (
                    <div key={f.id} className="list-item">
                      <div className="meta">
                        <span className="title">🎫 {f.fileName || "כרטיס"}</span>
                        <span className="sub">
                          ברקוד: <code dir="ltr">{f.barcode}</code>
                          {f.rotatedAt ? " · 🔄 הונפק מחדש (הישן בוטל)" : " · פעיל"}
                        </span>
                      </div>
                      <a href={`/api/tickets/${f.id}/download`} className="chip">⬇️ הורדה</a>
                    </div>
                  ))}
                </div>
              ) : null}

              {/* upload form */}
              <form action={uploadTicketAction} className="ticket-upload">
                <input type="hidden" name="listingId" value={r.id} />
                <input className="input" type="file" name="file" accept=".pdf,image/*" required />
                <input className="input" name="barcode" placeholder="ברקוד (אופציונלי — אחרת ייווצר)" dir="ltr" />
                <button type="submit" className="chip">⬆️ העלאת כרטיס</button>
              </form>
            </div>
          );
        })
      )}

      <p className="hint" style={{ marginTop: 14 }}>
        🔒 בעת מכירה, הברקוד של הכרטיס מבוטל מול האולם ומונפק ברקוד חדש לקונה (כרגע ב-<strong>sandbox</strong>).
        מכרת? נהל מסירה ב<Link href="/account/sales">המכירות שלי →</Link>
      </p>
    </main>
  );
}
