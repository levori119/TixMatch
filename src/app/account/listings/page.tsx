import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { listListingsForSeller } from "@/db/listings";
import { cancelListingAction } from "./actions";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  active: "פעיל",
  reserved: "משוריין",
  sold: "נמכר ✓",
  cancelled: "בוטל",
};

function ils(a: number | null) {
  return a == null ? "—" : `₪${(a / 100).toLocaleString("he-IL")}`;
}

export default async function MyListingsPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const rows = await listListingsForSeller(user.id);

  return (
    <main className="container narrow">
      <div className="page-head">
        <Link href="/account" className="crumb">← החשבון שלי</Link>
        <h1 className="page-title">הכרטיסים שלי 🎫</h1>
      </div>

      <div className="cta-row" style={{ justifyContent: "flex-start", marginBottom: 8 }}>
        <Link href="/sell" className="btn">➕ מכירת כרטיס חדש</Link>
      </div>

      <div className="card">
        {rows.length === 0 ? (
          <p className="empty">
            עדיין לא פרסמת כרטיסים. <Link href="/sell">מכור את הראשון →</Link>
          </p>
        ) : (
          <div className="list">
            {rows.map((r) => (
              <div key={r.id} className="list-item">
                <div className="meta">
                  <span className="title">
                    {r.eventName} — {ils(r.basePriceAgorot)} לכרטיס
                  </span>
                  <span className="sub">
                    {r.venueName} ·{" "}
                    {new Date(r.startsAt).toLocaleDateString("he-IL")} ·{" "}
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
            ))}
          </div>
        )}
      </div>

      <p className="hint" style={{ marginTop: 14 }}>
        מכרת? נהל את מסירת הכרטיסים ב<Link href="/account/sales">המכירות שלי →</Link>
      </p>
    </main>
  );
}
