import { listBuyRequests, listBuyers } from "@/db/matching";
import { listShows } from "@/db/catalog";
import { cancelRequestAction } from "./actions";
import { RequestForm } from "./request-form";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  queued: "בתור ⏳",
  matched: "הותאם ✓",
  fulfilled: "הושלם",
  expired: "פג",
  cancelled: "בוטל",
};

function ils(agorot: number | null) {
  if (agorot == null) return "—";
  return `₪${(agorot / 100).toLocaleString("he-IL")}`;
}

export default async function RequestsPage() {
  const [reqs, buyers, shows] = await Promise.all([
    listBuyRequests(),
    listBuyers(),
    listShows(),
  ]);

  const showOptions = shows.map((s) => ({
    id: s.id,
    label: `${s.eventName} · ${s.venueName} · ${new Date(s.startsAt).toLocaleDateString("he-IL")}`,
  }));
  const buyerOptions = buyers.map((b) => ({ id: b.id, label: b.name }));

  return (
    <main className="container narrow">
      <div className="page-head">
        <span className="crumb">ניהול / בקשות קנייה</span>
        <h1 className="page-title">בקשות קנייה (תור FCFS) 🔎</h1>
      </div>

      <div className="card">
        <RequestForm buyers={buyerOptions} shows={showOptions} />
      </div>

      <div className="card">
        <p className="section-title">תור הבקשות ({reqs.length})</p>
        {reqs.length === 0 ? (
          <p className="empty">עדיין אין בקשות. צור את הראשונה ☝️</p>
        ) : (
          <div className="list">
            {reqs.map((r) => (
              <div key={r.id} className="list-item">
                <div className="meta">
                  <span className="title">
                    #{r.seq} · {r.buyerName} → {r.eventName}
                  </span>
                  <span className="sub">
                    עד {ils(r.priceMaxAgorot)}/כרטיס · {r.qtyMin}–{r.qtyMax} כרט' ·{" "}
                    {statusLabel[r.status] ?? r.status}
                    {r.status === "matched" && r.matchedQty
                      ? ` · קיבל ${r.matchedQty} ב-${ils(r.matchedUnitAgorot)}`
                      : ""}
                  </span>
                </div>
                {r.status === "queued" ? (
                  <form action={cancelRequestAction}>
                    <input type="hidden" name="id" value={r.id} />
                    <button type="submit" className="chip danger">ביטול</button>
                  </form>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
